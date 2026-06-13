Ring 1 — Personal Layer
  ├── Schedule & Timetable
  ├── Deadlines & Assignments  
  ├── Burnout & Wellness Score
  ├── Study Plans
  └── Personal Notes/Chat History

Ring 3 — Campus Ecosystem Layer (Ring 2 absorbed here)
  ├── 3A: People & Knowledge
  │     ├── Peer Learning & Matching
  │     ├── Expertise Graph
  │     ├── Placement Experiences (seniors → juniors)
  │
  ├── 3B: Academics & Career
  │     ├── Company Profiles & Prep Roadmaps
  │     ├── Interview Question Bank
  │     ├── Placement Drive Notices
  │     └── Skill Gap Analysis (your skills vs company requirements)
  │
  ├── 3C: Physical Campus
  │     ├── Transport Routes & Live Updates
  │     ├── Campus Services Directory
  │     ├── Room & Facility Availability
  │     └── Campus Events & Clubs
  │
  ├── 3D: Food & Daily Life
  │     ├── Mess Menu & Ratings
  │     ├── Canteen Directory
  │     ├── Group Order Coordination
  │     └── Nutrition Tracking
  │
  └── 3E: Local & Offcampus
        ├── Hyperlocal Place Directory
        ├── Weekend Trips
        ├── Emergency Contacts
        └── Campus Survival Guide (fresher onboarding)

Ring 4 — Intelligence Layer
  └── Reads ALL of Ring 1 + Ring 3
      Produces cross-domain insights, morning briefing,
      proactive alerts, and burnout recommendations


CampusFlow — Master Build Plan: Ring 3 + Ring 4
How to use this document: Feed Antigravity one phase at a time in order. Every phase builds on the previous. Ring 4 is last because it needs all Ring 3 data to be meaningful. Read PROJECT_CONTEXT.md before every phase.

> [!TIP]
> **Hackathon Readiness Note:**
> To keep velocity high for the 100-student hackathon scale:
> 1. We will intentionally omit Prisma `@relation` foreign keys for cross-references (e.g. `MealRating.messMenuId`) to keep schemas flexible.
> 2. `searchEverything` in Phase 21 will use in-memory Javascript cosine similarity rather than a complex FAISS setup for 13 tables, which is perfectly fast enough for <100 students.
> 3. The Peer System (`ExpertiseSeed`, `LearningMatch`, `PeerNotification`) is already present in the codebase, so no Phase 14.5 is needed!

 Update it after every phase.
Architecture principle that governs every phase: Every new entity — company, transport route, campus service, local place — gets an embedding generated via embedText() and stored as JSON. This is non-negotiable. Ring 4's cross-domain intelligence only works if everything lives in the same embedding space.

RING 3A — PEOPLE & KNOWLEDGE

PHASE 15 — Company Profiles + Interview Experience Bank
TASK: Build the company knowledge base that connects placement drives
to peer learning and skill gap analysis.

Read PROJECT_CONTEXT.md before starting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to prisma/schema.prisma EXACTLY as written:

model Company {
  id                String   @id @default(cuid())
  instituteName     String
  name              String
  domain            String
  // "tech" | "finance" | "consulting" | "core" | "product" | "other"
  packageMin        Float?   // in LPA
  packageMax        Float?   // in LPA
  interviewRounds   Int?
  roundDescriptions Json?
  // ["Online Assessment", "Technical Round 1", "HR Round"]
  topSkillsRequired Json
  // ["DSA", "System Design", "SQL"] — used for skill gap analysis
  campusVisitCount  Int      @default(0)
  // how many times this company has visited this campus
  lastVisitedYear   Int?
  description       String?  @db.Text
  websiteUrl        String?
  embedding         Json
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model InterviewExperience {
  instituteName String
  id            String   @id @default(cuid())
  companyId     String
  studentName   String?
  // null if isAnonymous=true
  batch         String
  // "2024", "2025" — year of placement
  branch        String
  outcome       String
  // "selected" | "rejected_r1" | "rejected_r2" | "rejected_hr" | "offer_declined"
  packageOffered Float?
  // only if outcome="selected" and student chose to share
  rounds        Json
  // array of { roundName, duration, questions: string[], tips: string }
  overallTips   String   @db.Text
  isAnonymous   Boolean  @default(true)
  isVerified    Boolean  @default(false)
  // placement cell can verify authenticity
  upvotes       Int      @default(0)
  embedding     Json
  // embed: companyName + branch + outcome + overallTips
  createdAt     DateTime @default(now())
}

model PrepQuestion {
  instituteName String
  id          String   @id @default(cuid())
  companyId   String
  round       String
  // "oa" | "technical" | "hr" | "managerial" | "case_study"
  question    String   @db.Text
  answer      String?  @db.Text
  // community-contributed answer, optional
  difficulty  String   @default("medium")
  // "easy" | "medium" | "hard"
  upvotes     Int      @default(0)
  submittedBy String?
  // userId of contributor
  isVerified  Boolean  @default(false)
  embedding   Json
  createdAt   DateTime @default(now())
}

model SkillGapAnalysis {
  id            String   @id @default(cuid())
  userId     String
  companyId     String
  gaps          Json
  // [{ skill: "System Design", status: "missing"|"weak"|"strong", priority: 1 }]
  peerMatchIds  Json
  // [userId] — peers who can help close each gap
  generatedAt   DateTime @default(now())
  expiresAt     DateTime
  // regenerate after 7 days or after new expertise signals

  @@unique([userId, companyId])
}

Run: npx prisma generate && npx prisma db push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — SKILL GAP ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create lib/skillGapEngine.ts:

export async function analyzeSkillGap(
  userId: string,
  companyId: string
): Promise<SkillGapAnalysis>

Logic:
1. Fetch company.topSkillsRequired (array of skills)
2. Fetch student's expertise via getExpertiseProfile(userId)
   (from Phase 11 expertiseEngine.ts)
3. For each required skill:
   - Search ExpertiseSeed for this userId + topic similarity
   - If confidence >= 2: status = "strong"
   - If confidence === 1: status = "weak"
   - If not found: status = "missing"
4. For each gap (missing or weak):
   - Run findCandidatesForRequest with topic = skill
     and context.upcomingDriveCompanyId = companyId
   - Store top 2 userIds as peerMatchIds for that skill
5. Sort gaps by priority:
   priority 1 = missing skills that are in topSkillsRequired[0..2]
   priority 2 = weak skills in top requirements
   priority 3 = missing skills lower in the list
6. Upsert SkillGapAnalysis
7. Return result

Export also:
async function getOrRefreshSkillGap(
  userId: string,
  companyId: string
): Promise<SkillGapAnalysis>
- Check if existing analysis is < 7 days old
- If fresh: return cached
- If stale or missing: call analyzeSkillGap and return fresh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GET /api/companies ──
Returns all companies sorted by lastVisitedYear DESC, campusVisitCount DESC.
Accept ?search=query param — fuzzy search on company name.
Accept ?domain=tech filter.
Returns: [{ ...company, topSkillsRequired, packageRange }]

── POST /api/companies [admin] ──
Accept company data. Validate all fields.
Generate embedding: embedText(name + " " + domain + " " + topSkillsRequired.join(" "))
Create Company row. Return created company.

── GET /api/companies/[id] ──
Returns full company profile including:
- Company details
- Last 5 InterviewExperiences (sorted by createdAt DESC)
- Top 10 PrepQuestions (sorted by upvotes DESC)
- Aggregate stats: { totalExperiences, selectionRate, avgPackage }
  selectionRate = count(outcome="selected") / count(all experiences)

── POST /api/companies/[id]/experience ──
Accept: {
  userId: string
  batch: string
  branch: string
  outcome: string (must be one of the 5 valid values)
  packageOffered?: number
  rounds: { roundName, duration, questions: string[], tips: string }[]
  overallTips: string (min 50 chars — enforce quality)
  isAnonymous: boolean
}
Validate outcome is in allowed set.
Validate rounds is non-empty array.
Generate embedding: embedText(companyName + branch + outcome + overallTips)
Create InterviewExperience.
Increment company.campusVisitCount if batch is new year for this company.
Return created experience.

── POST /api/companies/[id]/questions ──
Accept: { userId, round, question, answer?, difficulty }
Generate embedding.
Create PrepQuestion.
Return created question.

── PATCH /api/companies/[id]/questions/[qid]/upvote ──
Increment upvote count.
One upvote per userId — store in a simple Json array on the row
or a separate UpvotedQuestion table. Document choice.

── GET /api/companies/[id]/skill-gap?userId=xxx ──
Calls getOrRefreshSkillGap(userId, companyId).
Returns SkillGapAnalysis with full gap details and peer suggestions.

── POST /api/companies/placement-drive ──
This is called when a placement notice is ingested (email/Telegram)
and the notice category is "placement".
Accept: { noticeId, companyName, visitDate }
- Find or create Company by name
- If found: update lastVisitedYear, increment campusVisitCount
- If not found: create with name only (other fields null — to be filled)
- Trigger skill gap analysis for ALL profiles that have emailSyncEnabled
  (fire and forget — this is background work)
- Create alerts (AlertType: "placement_deadline") for all students
Return: { companyId, isNew: boolean }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — UI PAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── app/placement/page.tsx ──
Two sections:

SECTION 1 — Upcoming Drives (from placement notices)
- Cards showing: company name, visit date, package range,
  domain badge, "X days away" countdown
- Click card → company detail page
- If skill gap exists for this company: show gap preview
  "2 skill gaps identified — view plan"

SECTION 2 — Company Directory
- Search bar + domain filter
- Grid of company cards
- Each card: name, domain badge, package range,
  selection rate, experience count
- "Add Experience" button (only shown after visiting company page)

── app/placement/[companyId]/page.tsx ──
Tabs:

TAB 1 — Overview
- Company stats (rounds, package, selection rate, visit history)
- Skill Gap Card (if userId in localStorage):
  Shows gap analysis with colored indicators:
  green = strong, amber = weak, red = missing
  For each gap: "Find peer who knows this" button
  → navigates to /peer-learning?topic=SKILL&from=placement&companyId=ID

TAB 2 — Interview Experiences
- Chronological list of experiences (newest first)
- Filter by: outcome, branch, batch
- Each experience card:
  - Anonymous avatar or name if not anonymous
  - Outcome badge (green=selected, red=rejected, etc.)
  - Package chip (if shared)
  - Round-by-round accordion
  - Tips section
  - Upvote button
- "Share Your Experience" button → form (if student has visited this company)

TAB 3 — Question Bank
- Questions grouped by round
- Each question: text, difficulty badge, upvote count, answer toggle
- "Add Question" button
- Sort by: most upvoted, most recent, difficulty

── Add "Placement" to Sidebar nav ──
Icon: lucide-react Briefcase
Position: between Deadlines and Peer Learning

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART E — SEED DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seed 5 companies with realistic data:
1. Amazon — tech, 18-32 LPA, 4 rounds, skills: [DSA, System Design, OOP]
2. Deloitte UST — consulting, 7-12 LPA, 3 rounds, skills: [SQL, Case Study, Communication]
3. Infosys — tech, 3.6-8 LPA, 2 rounds, skills: [Aptitude, Basic Programming, Communication]
4. Goldman Sachs — finance, 20-45 LPA, 5 rounds, skills: [DSA, Probability, SQL, System Design]
5. Tata Motors — core, 6-10 LPA, 3 rounds, skills: [Core Engineering, Aptitude, GD]

For each company seed 2 InterviewExperiences and 3 PrepQuestions.
Generate real embeddings for all rows.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 15
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Skill gap analysis: seed ExpertiseSeed for a userId with
   confidence=2 for "DSA", nothing for "System Design".
   Call analyzeSkillGap for Amazon.
   Confirm: DSA=strong, System Design=missing, peerMatchIds populated.

2. GET /api/companies/[id]/skill-gap called twice within 7 days →
   second call must return cached result (no Prisma query for gap,
   just the existing row). Confirm by checking DB timestamps.

3. POST /api/companies/placement-drive with a company name that
   already exists → must find existing company, not create duplicate.
   Confirm campusVisitCount incremented.

4. InterviewExperience with outcome not in allowed set → 400.
5. InterviewExperience with overallTips < 50 chars → 400.
6. Upvote same question twice with same userId → count stays at 1.

7. Navigate to /placement → upcoming drives show correctly.
   Click company → all 3 tabs render with seeded data.
   Skill gap card shows correct colors for seeded expertise.

Update PROJECT_CONTEXT.md. Mark Phase 15 complete.

PHASE 16 — Placement Experiences: Senior → Junior Knowledge Transfer
TASK: Build the structured knowledge transfer pipeline where seniors
share experiences and juniors get AI-synthesized prep guidance.

Read PROJECT_CONTEXT.md before starting.

This phase extends Phase 15 by adding:
1. AI synthesis of all experiences for a company into a prep guide
2. Personalized prep roadmap generation
3. Connection between skill gaps and peer learning requests

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — AI PREP GUIDE GENERATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to prisma/schema.prisma:

model CompanyPrepGuide {
  instituteName String
  id            String   @id @default(cuid())
  companyId     String   @unique
  synthesisText String   @db.Text
  // AI-synthesized guide from all interview experiences
  keyThemes     Json
  // ["Focus on trees and graphs", "HR asks about leadership"]
  doList        Json     // ["Practice 2 DSA problems daily"]
  dontList      Json     // ["Don't skip the HR round prep"]
  generatedAt   DateTime @default(now())
  basedOnCount  Int
  // how many experiences were used to generate this
}

model PersonalizedPrepPlan {
  id              String   @id @default(cuid())
  userId       String
  companyId       String
  daysUntilDrive  Int
  planText        String   @db.Text
  // day-by-day markdown plan
  skillGapIds     Json
  // which gaps this plan addresses
  generatedAt     DateTime @default(now())

  @@unique([userId, companyId])
}

Run: npx prisma generate && npx prisma db push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — AI SYNTHESIS ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create lib/prepGuideGenerator.ts:

── generateCompanyPrepGuide(companyId: string) ──
1. Fetch all InterviewExperiences for this company
   If < 2 experiences: return null (not enough data)
2. Build context string:
   experiences.map(e =>
     `${e.branch} student, ${e.batch}, outcome: ${e.outcome}
      Rounds: ${JSON.stringify(e.rounds)}
      Tips: ${e.overallTips}`
   ).join("\n---\n")
3. Gemini prompt (USE VERBATIM):
   "You are synthesizing interview experiences for ${companyName}
    submitted by students who have been through their campus recruitment.
    
    Based on ${experiences.length} real experiences below, create a
    concise prep guide. Return ONLY raw JSON:
    {
      synthesisText: "2-3 paragraph synthesis of what the process is like",
      keyThemes: ["theme1", "theme2", "theme3"],
      doList: ["specific action 1", "specific action 2", "specific action 3"],
      dontList: ["mistake to avoid 1", "mistake to avoid 2"]
    }
    
    Be specific — name actual topics mentioned across experiences.
    Do not invent information not present in the experiences.
    If experiences conflict, mention both perspectives.
    
    Experiences:
    ${context}"
4. Parse response, validate fields, upsert CompanyPrepGuide
5. Regenerate when a new InterviewExperience is added for this company
   (trigger from POST /api/companies/[id]/experience)

── generatePersonalizedPrepPlan ──
async function generatePersonalizedPrepPlan(
  userId: string,
  companyId: string
): Promise<PersonalizedPrepPlan>

1. Fetch: company, skillGapAnalysis, studentSchedule,
          otherDeadlines (next 14 days), companyPrepGuide
2. daysUntilDrive = days until placement drive notice eventDate
3. Gemini prompt (USE VERBATIM):
   "You are creating a personalized interview prep plan.
    
    Student profile:
    - Branch: ${branch}
    - Skill gaps for ${companyName}: ${gaps.map(g => g.skill + ': ' + g.status).join(', ')}
    
    Company context:
    - Interview rounds: ${company.interviewRounds}
    - Key skills required: ${company.topSkillsRequired.join(', ')}
    - Prep guide summary: ${prepGuide?.synthesisText ?? 'Not available'}
    
    Time available: ${daysUntilDrive} days
    
    Student's class schedule (busy hours):
    ${scheduleContext}
    
    Other deadlines in this window:
    ${deadlineContext}
    
    Generate a realistic day-by-day prep plan that:
    1. Prioritizes closing the MISSING skill gaps first
    2. Schedules study only in free time (not during classes)
    3. Doesn't overload days with other deadlines
    4. Includes specific resources (e.g. 'Solve 5 medium graph problems on LeetCode')
    5. Saves last 2 days for revision and rest
    
    Format: ## Day 1 (Monday, Nov 4) followed by bullet points.
    Return ONLY the markdown plan."
4. Upsert PersonalizedPrepPlan
5. Return result

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GET /api/companies/[id]/prep-guide ──
Returns existing CompanyPrepGuide or generates one if missing.
Include basedOnCount in response so UI can show
"Based on 12 student experiences"

── POST /api/companies/[id]/prep-plan ──
Accept: { userId: string }
Calls generatePersonalizedPrepPlan.
Returns the full plan as markdown.
Show loading state — this call takes 3-8 seconds.

── GET /api/companies/[id]/prep-plan?userId=xxx ──
Returns existing PersonalizedPrepPlan if generated.
404 if not yet generated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — UI ADDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Add to app/placement/[companyId]/page.tsx:

TAB 4 — My Prep Plan
- "Generate My Plan" button (calls POST /api/companies/[id]/prep-plan)
- Shows personalized plan rendered as markdown
- Shows skill gap summary above the plan
- "Find peers for my gaps" section:
  For each missing/weak skill: show matching peer cards
  (from skillGapAnalysis.peerMatchIds)
  Each peer card has "Request help" button → POST /api/peer/request
  with topic pre-filled and context:
  { topic: skill, description: "Preparing for ${companyName} drive in ${N} days" }
- "Regenerate" button (invalidates cache)

Add to company Overview tab:
- AI Prep Guide section (from CompanyPrepGuide)
- "Based on X student experiences" label
- Do's and Don'ts as two columns

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 16
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. generateCompanyPrepGuide with 1 experience → returns null,
   no CompanyPrepGuide row created.
2. With 2+ experiences → guide generated, key themes are
   specific to the seeded experience content (not generic).
3. Add a new experience → confirm guide regenerates automatically.
4. Personalized prep plan: student with 3 skill gaps for Amazon,
   drive in 7 days → plan mentions all 3 gaps with specific tasks.
5. Plan with 0 days until drive → handles gracefully (returns
   "Drive is today — focus on rest and revision" message).
6. "Find peers for gap" → clicking request button pre-fills
   correct topic and navigates to peer learning.

Update PROJECT_CONTEXT.md. Mark Phase 16 complete.

RING 3C — PHYSICAL CAMPUS

PHASE 17 — Transport Intelligence
TASK: Build the campus transport system with crowdsourced live updates
and interview travel planning.

Read PROJECT_CONTEXT.md before starting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

model TransportRoute {
  instituteName String
  id          String   @id @default(cuid())
  name        String
  // "Bus 3", "Shuttle A"
  type        String
  // "bus" | "shuttle" | "auto_stand" | "cab_point"
  stops       Json
  // [{ name: "Main Gate", time: "08:45" }, ...]
  operatingDays Json
  // ["Monday", "Tuesday", ...] or ["Weekdays"] or ["All"]
  frequency   String?
  // "Every 30 minutes", "Fixed schedule"
  notes       String?
  isActive    Boolean  @default(true)
  embedding   Json
  createdAt   DateTime @default(now())
}

model TransportUpdate {
  instituteName String
  id          String   @id @default(cuid())
  routeId     String?
  // null = general campus transport update
  updateType  String
  // "delay" | "cancelled" | "full" | "early" | "general"
  message     String
  reportedBy  String
  // userId
  severity    String   @default("info")
  // "info" | "warning" | "critical"
  expiresAt   DateTime
  // auto-expire after 3 hours
  upvotes     Int      @default(0)
  // other students confirming the update
  createdAt   DateTime @default(now())
}

model CabPoolRequest {
  instituteName String
  id            String   @id @default(cuid())
  initiatorId   String
  destination   String
  destinationLat Float?
  destinationLng Float?
  departureTime DateTime
  seatsAvailable Int
  estimatedCost  Float?
  // total cost to split
  participants  Json
  // [userId, ...]
  status        String   @default("open")
  // "open" | "full" | "departed" | "cancelled"
  notes         String?
  createdAt     DateTime @default(now())
}

Run: npx prisma generate && npx prisma db push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — INTERVIEW TRAVEL PLANNER
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create lib/travelPlanner.ts:

async function planInterviewTravel(
  venue: string,
  interviewDate: Date,
  interviewTime: string
): Promise<TravelPlan>

type TravelPlan = {
  venue: string
  recommendedDepartureTime: string
  // "08:30 AM" — 30 mins buffer before interview
  availableBuses: TransportRoute[]
  // buses with a stop near the venue
  cabPoolSuggestions: CabPoolRequest[]
  // open cab pools going same direction same day
  estimatedTravelTime: string
  // "45 minutes by bus, 25 minutes by cab"
  tips: string[]
  // ["Book cab by 9pm tonight", "Carry printed resume"]
}

Logic:
1. Search TransportRoute stops for venue keyword match
   (embedText(venue) cosine similarity against stops JSON)
2. Find CabPoolRequests where:
   departureTime is same day as interviewDate
   status = "open"
   destination contains venue keywords
3. Compute recommended departure = interviewTime - 90 minutes
   (always give buffer — interviews run over, traffic happens)
4. Return structured plan

This is called by Ring 4 when a placement drive is detected.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GET /api/transport/routes ──
Returns all active TransportRoute rows.
Accept ?day=Monday filter.
Accept ?search=venue query — finds routes that pass near a venue.

── POST /api/transport/routes [admin] ──
Create a new route. Generate embedding of name + stops text.

── GET /api/transport/updates ──
Returns non-expired TransportUpdate rows sorted by severity DESC.
Auto-filters: expiresAt > now()

── POST /api/transport/updates ──
Accept: { userId, routeId?, updateType, message, severity }
message: min 10 chars, max 200 chars.
expiresAt = now() + 3 hours.
Create TransportUpdate. Return created row.
Trigger a PeerNotification to all profiles
(type: "general", message: update.message) if severity="critical".

── PATCH /api/transport/updates/[id]/confirm ──
Increment upvotes by 1.
One confirmation per userId.

── GET /api/transport/cab-pools ──
Returns open CabPoolRequests where departureTime > now().
Accept ?destination=venue filter.

── POST /api/transport/cab-pools ──
Accept: { initiatorId, destination, departureTime,
          seatsAvailable, estimatedCost?, notes? }
Validate departureTime is in the future.
Create CabPoolRequest.
Return created row.

── PATCH /api/transport/cab-pools/[id]/join ──
Accept: { userId }
Validate: status="open", userId not already in participants,
          participants.length < seatsAvailable.
Add userId to participants Json array.
If participants.length === seatsAvailable: set status="full".
Return updated row.

── GET /api/transport/plan?venue=X&date=Y&time=Z ──
Calls planInterviewTravel and returns TravelPlan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── app/transport/page.tsx ──

Three tabs:

TAB 1 — Bus & Shuttle Schedule
- Route cards: route name, type badge, stops list, operating days
- Live Updates banner at top (critical updates in red, warnings in amber)
- "Report Update" button → quick form (route, type, message)
- Confirm button on each update ("I can confirm this")

TAB 2 — Cab Pool
- "Start a Pool" form: destination, date/time, seats, cost
- List of open pools sorted by departure time
- Each pool card: destination, departure time, seats remaining,
  estimated cost per person, "Join" button
- Filter by: today, this week, destination search

TAB 3 — Plan My Travel
- Input: venue (text), date, time
- "Plan Route" button → calls GET /api/transport/plan
- Shows TravelPlan result:
  Recommended departure time (prominent)
  Matching bus routes
  Open cab pools
  Tips list

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART E — SEED DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seed 5 TransportRoutes with realistic stops and timings.
Seed 2 TransportUpdates (one delay, one cancellation).
Seed 1 CabPoolRequest (open, 2 seats, tomorrow).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 17
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. TransportUpdate with expiresAt in past →
   NOT returned by GET /api/transport/updates.
2. CabPool join: join until full → status changes to "full"
   on the last join.
3. Join same pool twice with same userId → second join rejected.
4. Join a full pool → rejected with clear error.
5. Travel plan with a venue matching a bus stop →
   that route appears in availableBuses.
6. Critical transport update → check that PeerNotification
   rows are created for all profiles.

Update PROJECT_CONTEXT.md. Mark Phase 17 complete.

PHASE 18 — Campus Services Directory
TASK: Build the campus services directory with crowdsourced
status updates and process guides.

Read PROJECT_CONTEXT.md before starting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

model CampusService {
  instituteName String
  id              String   @id @default(cuid())
  name            String
  category        String
  // "academic" | "admin" | "hostel" | "library" | "medical" | "sports" | "other"
  location        String
  // building + room number
  timings         Json
  // [{ days: "Monday-Friday", hours: "10:00-17:00" }]
  contactEmail    String?
  contactPhone    String?
  currentStatus   String   @default("unknown")
  // "open" | "closed" | "crowded" | "unknown"
  statusUpdatedAt DateTime?
  statusUpdatedBy String?
  // userId of last updater
  embedding       Json
  createdAt       DateTime @default(now())
}

model ProcessGuide {
  instituteName String
  id                 String   @id @default(cuid())
  serviceId          String
  title              String
  // "Get Bonafide Certificate", "Apply for Scholarship"
  steps              Json
  // [{ order: 1, instruction: "Go to Room 102 with your ID" }]
  documentsRequired  Json
  // ["College ID", "Fee receipt"]
  estimatedDays      Int
  // working days to complete
  fees               Float?   // in rupees, null if free
  tips               String?  @db.Text
  submittedBy        String?
  // userId of contributor
  upvotes            Int      @default(0)
  isVerified         Boolean  @default(false)
  embedding          Json
  createdAt          DateTime @default(now())
}

Run: npx prisma generate && npx prisma db push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GET /api/services ──
Returns all CampusService rows sorted by category.
Accept ?category= and ?search= filters.
Include: processGuideCount per service.

── POST /api/services [admin] ──
Create service. Generate embedding of name + category + location.

── PATCH /api/services/[id]/status ──
Accept: { userId, status, note? }
status must be one of: "open" | "closed" | "crowded"
Update currentStatus, statusUpdatedAt, statusUpdatedBy.
Status auto-expires after 4 hours back to "unknown".
(implement via: when fetching, if statusUpdatedAt < now()-4hrs,
return status as "unknown" without updating DB — lazy expiry)

── GET /api/services/[id]/guides ──
Returns all ProcessGuide rows for this service,
sorted by upvotes DESC.

── POST /api/services/[id]/guides ──
Accept: { userId, title, steps, documentsRequired,
          estimatedDays, fees?, tips? }
Validate: steps is non-empty array, each step has order+instruction.
Generate embedding: embedText(title + steps.map(s=>s.instruction).join(" "))
Create ProcessGuide.

── POST /api/services/search-guide ──
Accept: { query: string }
This is the natural language search: "I need a bonafide certificate"
embedText(query) → cosine similarity against all ProcessGuide embeddings
Returns top 3 matching guides with their parent service info.
This is the primary UX — students describe what they need,
system finds the right guide.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── app/services/page.tsx ──

SECTION 1 — Smart Search (top, prominent)
Large search bar: "What do you need help with?"
Placeholder: "bonafide certificate, scholarship, hostel complaint..."
On submit: POST /api/services/search-guide
Show matched guides immediately below search.
This is the primary entry point — most students don't know
which office handles what.

SECTION 2 — Service Directory
Category tabs: Academic | Admin | Hostel | Library | Medical | Sports
Each service card:
- Name, location chip
- Current status badge (green=open, red=closed, amber=crowded, gray=unknown)
  Status age: "Updated 2 hours ago" or "Status unknown"
- "Update Status" button → quick 3-button picker (Open/Closed/Crowded)
- "View Guides" button → expands guide list

Process Guide card:
- Title, estimated days, fees chip
- Documents required as tag list
- Step-by-step accordion
- Tips section
- Upvote button + count
- "Add Guide" button

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — SEED DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seed 6 CampusServices:
1. Academic Section — academic — Room 102 A Block
2. Accounts Office — admin — Ground Floor Admin Block
3. Hostel Warden Office — hostel — Hostel Block C
4. Central Library — library — Main Building
5. Medical Centre — medical — Gate 2
6. Placement Cell — academic — Room 301 B Block

Seed 8 ProcessGuides (one or two per service):
- Bonafide Certificate (Academic Section) — 2 days, free
- Migration Certificate (Academic Section) — 7 days, ₹100
- Fee Payment Receipt (Accounts Office) — same day, free
- Hostel Room Change (Hostel Warden) — 3 days, free
- Library Card Renewal (Library) — same day, free
- Sick Leave Application (Medical) — same day, free

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 18
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Search "I need a bonafide certificate" → Bonafide Certificate
   guide must be in top 3 results.
2. Search "how do I pay my fees" → Fee Payment Receipt guide
   must appear.
3. Status update: set to "open". Wait (mock): statusUpdatedAt = 5 hours ago.
   GET /api/services → that service shows status "unknown" (lazy expiry).
4. POST guide with empty steps array → 400.
5. Smart search with a completely irrelevant query →
   returns empty array gracefully, not an error.

Update PROJECT_CONTEXT.md. Mark Phase 18 complete.

RING 3D — FOOD & DAILY LIFE

PHASE 19 — Food Intelligence Expansion
TASK: Expand existing mess module with ratings, nutrition estimates,
canteen directory, and group order coordination.

Read PROJECT_CONTEXT.md before starting.
The MessMenu table already exists from Phase 5.
This phase extends it — do not recreate or modify existing fields.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

model MealRating {
  id          String   @id @default(cuid())
  messMenuId  String
  userId   String
  rating      Int
  // 1-5 stars
  comment     String?
  createdAt   DateTime @default(now())

  @@unique([messMenuId, userId])
  // one rating per student per meal slot
}

model NutritionEstimate {
  instituteName String
  id          String   @id @default(cuid())
  messMenuId  String   @unique
  calories    Int
  proteinG    Float
  carbsG      Float
  fatG        Float
  fibreG      Float?
  isEstimated Boolean  @default(true)
  // always true — Gemini estimates, not lab results
  generatedAt DateTime @default(now())
}

model CanteenItem {
  instituteName String
  id          String   @id @default(cuid())
  canteenName String
  itemName    String
  price       Float
  category    String
  // "snack" | "meal" | "beverage" | "dessert"
  isVeg       Boolean  @default(true)
  isAvailable Boolean  @default(true)
  rating      Float?
  // average of student ratings
  embedding   Json
  createdAt   DateTime @default(now())
}

model GroupOrder {
  instituteName String
  id            String   @id @default(cuid())
  initiatorId   String
  platform      String
  // "swiggy" | "zomato" | "direct" | "other"
  restaurantName String
  orderDeadline DateTime
  // cutoff time for joining
  deliveryLocation String
  participants  Json
  // [{ userId, items: string, amount: number }]
  status        String   @default("open")
  // "open" | "placed" | "delivered" | "cancelled"
  totalAmount   Float?
  notes         String?
  createdAt     DateTime @default(now())
}

Run: npx prisma generate && npx prisma db push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — NUTRITION ESTIMATOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create lib/nutritionEstimator.ts:

async function estimateNutrition(
  messMenuId: string,
  items: string
): Promise<NutritionEstimate>

Gemini prompt (USE VERBATIM):
"Estimate the approximate nutritional content of a typical Indian
college mess meal serving containing: ${items}

Assume standard serving sizes for a college student.
Return ONLY raw JSON (no markdown):
{
  calories: number,
  proteinG: number,
  carbsG: number,
  fatG: number,
  fibreG: number
}
All values should be realistic estimates for ONE serving.
Round to nearest integer for calories, one decimal for macros."

Validate: calories must be between 50 and 2000.
If validation fails: use safe defaults { calories: 400, proteinG: 12,
carbsG: 60, fatG: 10, fibreG: 5 } and log warning.
Upsert NutritionEstimate. Return result.

Call this when a new MessMenu row is created (in POST /api/mess).
Fire and forget — don't block the mess upload on nutrition estimation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── POST /api/mess/[id]/rate ──
Accept: { userId, rating (1-5), comment? }
Upsert MealRating. One per userId per meal.
Return updated average rating.

── GET /api/mess/today/mood ──
Returns today's mess meal ratings as a "crowd mood":
{
  breakfast: { avgRating: 3.8, totalRatings: 12, topComment: "..." },
  lunch: { avgRating: 2.1, totalRatings: 8, topComment: "..." },
  dinner: { avgRating: null, totalRatings: 0 }
  // null if no ratings yet
}

── GET /api/canteen ──
Returns all CanteenItem rows grouped by canteenName.
Accept ?available=true filter.

── POST /api/canteen [admin] ──
Create canteen item. Generate embedding of canteenName + itemName + category.

── GET /api/group-orders ──
Returns open GroupOrders where orderDeadline > now().

── POST /api/group-orders ──
Accept: { initiatorId, platform, restaurantName,
          orderDeadline, deliveryLocation, notes? }
Validate orderDeadline is in the future.
Create GroupOrder with initiatorId in participants array.

── PATCH /api/group-orders/[id]/join ──
Accept: { userId, items, amount }
Validate status="open" and deadline not passed.
Add to participants. Return updated order.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — UI ADDITIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extend app/mess/page.tsx with new sections:

ADDITION 1 — Meal Ratings on each meal card:
- Star rating widget (1-5)
- Average rating display + total count
- "Rate this meal" button (only after current meal time has started)
- Top comment shown below items

ADDITION 2 — Nutrition info on meal card:
- Small pill badges: "~450 kcal · 15g protein · 65g carbs"
- "Estimated" label always visible — never present as precise

ADDITION 3 — Mess Mood summary at top of page:
- Today's crowd mood: colored emoji indicators
  ⭐ 4.2+ = "Students love it today"
  ⭐ 3.0-4.2 = "Mixed reviews"
  ⭐ <3.0 = "Consider ordering out"
- This is shown BEFORE the weekly grid

Create app/canteen/page.tsx:
- Canteen selector (if multiple canteens)
- Menu grid: category tabs, item cards with price + veg/non-veg badge
- "Available now" toggle
- Ratings on each item

Create app/group-orders/page.tsx:
- "Start a Group Order" form
- List of open orders sorted by deadline
- Join button → modal to enter your items + amount
- Show participant count and remaining time

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 19
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Rate same meal twice with same userId →
   upsert: second rating replaces first, no duplicate row.
2. Nutrition estimate: validate calories between 50-2000.
   Mock Gemini to return calories: 5000 → safe defaults used,
   warning logged, no crash.
3. Group order: join after deadline → rejected with clear error.
4. GET /api/mess/today/mood when no ratings exist →
   returns null ratings gracefully, not 0 (0 is different from no data).
5. Mess upload triggers nutrition estimation for each new row
   (fire and forget) → NutritionEstimate rows created within 60 seconds.

Update PROJECT_CONTEXT.md. Mark Phase 19 complete.

RING 3E — LOCAL & OFFCAMPUS

PHASE 20 — Local Discovery + Campus Survival Guide
TASK: Build the hyperlocal place directory and campus survival guide.
This is the most crowdsourced module — quality of data depends on
student contributions. Design for contribution velocity.

Read PROJECT_CONTEXT.md before starting.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

model LocalPlace {
  instituteName String
  id            String   @id @default(cuid())
  name          String
  category      String
  // "food" | "stationery" | "medical" | "atm" | "salon"
  // | "gym" | "entertainment" | "emergency" | "other"
  distanceMeters Int?
  // walking distance from main gate
  direction     String?
  // "200m left from Gate 2"
  description   String   @db.Text
  priceRange    String?
  // "₹50-200 per person"
  timings       String?
  phone         String?
  mustTry       String?
  // specific recommendation: "Try the masala chai"
  submittedBy   String
  upvotes       Int      @default(0)
  isVerified    Boolean  @default(false)
  embedding     Json
  createdAt     DateTime @default(now())
}

model TripRecommendation {
  instituteName String
  id              String   @id @default(cuid())
  destination     String
  distanceKm      Int
  estimatedCost   Float
  // per person in rupees
  howToGet        String   @db.Text
  bestFor         String
  // "day trip" | "weekend" | "evening"
  bestSeason      String?
  highlights      Json
  // ["waterfall", "street food", "temple"]
  submittedBy     String
  upvotes         Int      @default(0)
  embedding       Json
  createdAt       DateTime @default(now())
}

model SurvivalTip {
  instituteName String
  id          String   @id @default(cuid())
  category    String
  // "fresher" | "hostel" | "food" | "academic"
  // | "money" | "health" | "social" | "general"
  title       String
  tip         String   @db.Text
  submittedBy String
  upvotes     Int      @default(0)
  isVerified  Boolean  @default(false)
  embedding   Json
  createdAt   DateTime @default(now())
}

Run: npx prisma generate && npx prisma db push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── GET /api/local/places ──
Returns LocalPlace rows sorted by upvotes DESC.
Accept ?category= filter.
Accept ?search= → embedText(search) cosine similarity search.

── POST /api/local/places ──
Accept all fields. Validate name + description non-empty.
Generate embedding: embedText(name + " " + category + " " + description)
Create row. Return created place.

── PATCH /api/local/places/[id]/upvote ──
One upvote per userId. Increment count.

── GET /api/local/trips ──
Sorted by upvotes DESC. Accept ?bestFor= filter.

── POST /api/local/trips ──
Validate estimatedCost > 0, distanceKm > 0.
Generate embedding. Create row.

── GET /api/local/survival-tips ──
Accept ?category= filter.
Returns tips sorted by: isVerified DESC, upvotes DESC.
Fresh tip category for freshers: GET /api/local/survival-tips?category=fresher
returns top 10 most upvoted verified tips.

── POST /api/local/survival-tips ──
Create tip. Generate embedding. Return created tip.

── POST /api/local/search ──
Accept: { query: string }
Natural language search across ALL three tables simultaneously.
Run embedText(query) cosine similarity against all embeddings.
Return top 5 results with a "type" field: "place" | "trip" | "tip"
This enables: "where can I get cheap printing near campus?" →
returns relevant LocalPlace + SurvivalTip results together.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — UI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

── app/discover/page.tsx ──

SECTION 1 — Smart Search (prominent)
"What are you looking for?"
Natural language search across all local data.
Results show type badge (Place / Trip / Tip).

SECTION 2 — Three tabs:

TAB 1 — Around Campus
Category filter chips: 🍕 Food | 📚 Stationery | 💊 Medical | 🏧 ATM | ✂️ Salon | 🚨 Emergency
Place cards:
- Name, category badge, distance chip
- Description, price range
- "Must try" highlighted tip
- Upvote button + count
- "Add a Place" button → contribution form

TAB 2 — Weekend Trips
Trip cards:
- Destination (large text), distance, cost per person
- "Best for" badge (Day Trip / Weekend / Evening)
- How to get there (collapsed accordion)
- Highlights as tag chips
- "Add a Trip" button

TAB 3 — Campus Survival Guide
Category filter: Fresher | Hostel | Food | Academic | Money | Health
Tip cards sorted by: verified first, then upvotes
"Share a Tip" button (low friction — just title + tip text)
Freshers see a special onboarding banner:
"New to campus? These are the top tips from your seniors."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — SEED DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Seed 8 LocalPlaces (realistic for an Indian engineering college):
1. Sharma Tea Stall — food — 150m from Gate 1 — ₹10-30 — "Cutting chai at 4pm"
2. Ganesh Xerox & Stationery — stationery — 300m Gate 2 — ₹1/page printing
3. Apollo Pharmacy — medical — 500m Gate 1 — 24hr
4. SBI ATM — atm — inside campus near library
5. Anand Fast Food — food — 200m Gate 2 — ₹50-150 — "Cheese sandwich"
6. City Medical Centre — emergency — 1.2km Gate 1 — emergency services
7. Campus Hair Studio — salon — 400m Gate 2 — ₹80-150
8. Reliance Digital — other — 2km — for electronics/cables

Seed 3 TripRecommendations.
Seed 10 SurvivalTips across all categories.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 20
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. POST /api/local/search "cheap food near college" →
   Sharma Tea Stall and Anand Fast Food in results.
2. POST /api/local/search "I need a printer" →
   Ganesh Xerox in results.
3. Upvote same place twice with same userId → count stays at 1.
4. GET /api/local/survival-tips?category=fresher →
   only fresher-category tips returned.
5. app/discover on mobile (375px) → category chips scroll
   horizontally without overflow, cards are readable.

Update PROJECT_CONTEXT.md. Mark Phase 20 complete.

RING 4 — INTELLIGENCE LAYER

PHASE 21 — Cross-Domain Intelligence Engine
TASK: Build Ring 4 — the engine that reads ALL Ring 1 + Ring 3 data
and produces cross-domain insights, enhanced morning briefing,
smart alerts, and the unified burnout model.

This is the phase that makes everything built so far feel like
a single intelligent system rather than a collection of features.

Read PROJECT_CONTEXT.md before starting.
This phase has zero new schema. It only reads existing data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART A — UNIFIED EMBEDDING SEARCH
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Extend lib/vectorStore.ts:

The existing searchAcrossTables function searches Notice, MessMenu,
Deadline. Extend it to search ALL entities:

async function searchEverything(
  queryEmbedding: number[],
  topK: number = 8
): Promise<UniversalSearchResult[]>

type UniversalSearchResult = {
  id: string
  type: "notice" | "deadline" | "mess" | "company" | "experience" |
        "prep_question" | "transport" | "service" | "guide" |
        "place" | "trip" | "tip" | "expertise"
  title: string
  body: string
  similarity: number
  metadata: Record<string, unknown>
  // type-specific extra fields
}

Fetch from ALL tables that have an embedding field:
Notice, Deadline, MessMenu, Company, InterviewExperience,
PrepQuestion, TransportRoute, CampusService, ProcessGuide,
LocalPlace, TripRecommendation, SurvivalTip, ExpertiseSeed

For each table:
- Fetch id + title/name field + body/description field + embedding
- Compute cosine similarity
- Tag with type

Merge all results, sort by similarity DESC, return top K.

This replaces the existing searchAcrossTables in the RAG chat pipeline.
Update POST /api/query to use searchEverything instead.
Now when a student asks "help me prepare for Amazon interview",
the context includes: company profile + interview experiences +
prep questions + peer expertise + relevant deadlines —
all in one retrieval pass.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART B — MULTI-DOMAIN BURNOUT MODEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create lib/burnoutModel.ts:

type BurnoutSignals = {
  // Ring 1 signals
  deadlineClusterScore: number   // 0-10: how many deadlines in next 48hrs
  overdueCount: number           // raw count
  scheduleLoadToday: number      // 0-10: classes today / max possible
  selfReportedScore: number      // 0-10: from wellness table

  // Ring 3A signals
  peerIsolationScore: number     // 0-10: inverse of peer activity
  // 0 = active peer connections, 10 = no activity in 14 days

  // Ring 3B signals
  placementAnxietyScore: number  // 0-10: skill gaps × drive proximity
  // = (missingSkillCount × 2) capped at 10, if drive in ≤7 days
  // = 0 if no upcoming drive

  // Ring 3C signals
  campusConfinementScore: number // 0-10: inverse of transport activity
  // 0 = left campus this week, 10 = no transport in 14+ days

  // Ring 3D signals
  nutritionScore: number         // 0-10: inverse of meal skip pattern
  // 0 = eating regularly, 10 = skipped 5+ meals this week
  // approximate: use MealRating activity as proxy (rated = ate)

  // Ring 3E signals
  recoveryDeficitScore: number   // 0-10: no trips/outings in extended period
}

async function computeBurnoutSignals(
  userId: string
): Promise<BurnoutSignals>

Logic for each signal:

deadlineClusterScore:
  deadlines = Deadline where isComplete=false and dueDate <= now+48hrs
  score = Math.min(10, deadlines.length * 2.5)

overdueCount:
  count = Deadline where isComplete=false and dueDate < now

scheduleLoadToday:
  classes = ClassSchedule where day = today
  score = Math.min(10, classes.length * 1.5)

selfReportedScore:
  Latest wellness record burnoutScore (if exists and < 3 days old)
  else 5 (neutral default)

peerIsolationScore:
  lastActivity = most recent LearningMatch where
    (requesterId=userId OR helperId=userId)
    AND status in ["accepted", "pending"]
  daysSince = days since lastActivity (or 30 if none)
  score = Math.min(10, daysSince / 1.5)

placementAnxietyScore:
  upcomingDrive = Notice where category="placement" and
    eventDate between today and today+7 days (first one)
  if no drive: return 0
  skillGap = SkillGapAnalysis for this userId + company
  if no gap analysis: return 3 (moderate default)
  missingCount = gaps.filter(g => g.status === "missing").length
  return Math.min(10, missingCount * 2 + (7 - daysUntilDrive))

campusConfinementScore:
  lastTransport = most recent TransportUpdate.reportedBy = userId
    OR CabPoolRequest where initiatorId=userId or in participants
    OR TripRecommendation.submittedBy = userId
  daysSince = days since lastTransport (or 21 if none)
  score = Math.min(10, daysSince / 2.5)

nutritionScore:
  ratingsThisWeek = MealRating where userId and
    createdAt >= 7 days ago
  // proxy: rated = ate. Should have 21 ratings for 3 meals/day
  expectedRatings = 21
  missedMeals = Math.max(0, expectedRatings - ratingsThisWeek)
  score = Math.min(10, missedMeals / 2)

recoveryDeficitScore:
  Same logic as campusConfinement but looks for TripRecommendation activity
  and LocalPlace upvote activity as proxy for "went somewhere"
  daysSince 30+ days → score 10

── computeCompositeBurnout ──

async function computeCompositeBurnout(
  signals: BurnoutSignals
): Promise<{
  score: number         // 0-10 weighted composite
  primaryDriver: string // the highest-scoring signal domain
  secondaryDriver: string
  trajectory: "improving" | "stable" | "worsening"
  // compare to last week's composite if available
}>

Weights (tuned for Indian engineering college context):
  deadlineClusterScore:    0.25
  placementAnxietyScore:   0.20
  selfReportedScore:       0.20
  peerIsolationScore:      0.15
  nutritionScore:          0.10
  campusConfinementScore:  0.05
  recoveryDeficitScore:    0.05

composite = sum(signal × weight) for all signals
primaryDriver = signal with highest raw score (before weighting)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART C — ENHANCED MORNING BRIEFING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace the existing briefing generation in
app/api/dashboard/briefing/route.ts with this enhanced version:

Fetch in parallel (Promise.allSettled — never let one failure
block the briefing):

const [
  todayClasses,
  upcomingDeadlines,
  placementDrives,       // NEW: Ring 3B
  skillGaps,             // NEW: Ring 3B
  transportAlerts,       // NEW: Ring 3C
  serviceAlerts,         // NEW: Ring 3C
  messMood,              // NEW: Ring 3D
  burnoutSignals,        // NEW: Ring 4
  peerActivity,          // NEW: Ring 3A
] = await Promise.allSettled([...])

Build urgencySignals as before but now include cross-domain signals:

// Existing signals...

// NEW cross-domain signals:
if (placementDrive && skillGaps?.gaps?.some(g => g.status === "missing")) {
  const missingCount = skillGaps.gaps.filter(g => g.status === "missing").length
  urgencySignals.push(
    `${missingCount} skill gap(s) for ${placementDrive.companyName} drive in ${daysUntilDrive} days`
  )
}

if (burnoutSignals?.primaryDriver === "peerIsolationScore" &&
    burnoutSignals.peerIsolationScore > 6) {
  urgencySignals.push("No peer connections in 10+ days — isolation risk")
}

if (transportAlerts.length > 0) {
  urgencySignals.push(`Transport alert: ${transportAlerts[0].message}`)
}

if (messMood?.lunch?.avgRating < 2.5) {
  urgencySignals.push("Today's mess lunch has poor ratings — consider canteen")
}

Enhanced Gemini prompt (USE VERBATIM):
"You are CampusFlow, an AI assistant that deeply understands a
student's entire campus life. This is their morning briefing.

Your job: synthesize the data below into 2-3 sentences that feel
like advice from a smart, caring senior who knows their whole week.

Rules:
- Start with the single most important thing they must act on TODAY.
- If you detect a cross-domain conflict (e.g. placement drive AND
  deadline cluster on same day), highlight it explicitly.
- End with ONE specific, concrete action they can take in 30 minutes.
- Tone: warm, direct, specific. Never generic.
- Never say 'Good morning' or 'Here is your briefing'.
- Never use bullet points — prose only.
- NEVER invent information not in the data.

URGENCY SIGNALS (most important — lead with these):
${urgencySignals.length > 0
  ? urgencySignals.map(s => "⚠ " + s).join("\n")
  : "No urgent conflicts today."}

TODAY'S CONTEXT:
Classes: ${classContext}
Deadlines (next 7 days): ${deadlineContext}
Placement: ${placementContext}
Skill gaps: ${skillGapContext}
Mess mood: ${messMoodContext}
Transport: ${transportContext}
Peer activity: ${peerContext}
Burnout composite: ${burnoutScore}/10 (primary driver: ${primaryDriver})

Respond with ONLY the 2-3 sentence briefing."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART D — ENHANCED ALERT ENGINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Create lib/alertEngine.ts with new Ring 3 alert types (since it does not exist yet):

Add to AlertType union:
  | "transport_disruption"   // critical transport update
  | "cab_pool_available"     // interview tomorrow, cab pool exists
  | "service_deadline"       // campus service deadline approaching
  | "peer_isolation"         // no peer activity for 14 days
  | "skill_gap_urgent"       // drive in ≤3 days, skill gaps exist
  | "meal_skip_pattern"      // 5+ meal skips detected this week
  | "burnout_trajectory"     // composite score worsening for 3 days

Implement each rule following the same pattern as Phase 12.

New rule: skill_gap_urgent
  - Find SkillGapAnalysis where drive ≤3 days and
    gaps contain status="missing"
  - One alert per company
  title: `Urgent: ${missingCount} skill gap(s) for ${company.name} in ${N} days`
  body: `You're missing ${gaps.map(g=>g.skill).join(", ")}. 
         ${peerMatchIds.length > 0
           ? "Peers who can help have been identified."
           : "Post a peer learning request now."}`
  actionLabel: "View prep plan"
  actionRoute: `/placement/${companyId}`
  severity: "critical"

New rule: cab_pool_available
  - Find upcoming placement drive with a venue
  - Find open CabPoolRequest going to similar destination
  title: "Cab pool available for your ${company.name} interview"
  body: "${N} students are sharing a cab to ${destination}. 
         Estimated ₹${costPerPerson} per person."
  actionLabel: "Join the pool"
  actionRoute: `/transport`
  severity: "info"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PART E — RAG CHAT UPGRADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Update POST /api/query to use searchEverything instead of
searchAcrossTables.

Update the context string builder to include type-specific
context headers:

results.map(r => {
  const typeLabel = {
    notice: "CAMPUS NOTICE",
    deadline: "DEADLINE",
    company: "COMPANY INFO",
    experience: "INTERVIEW EXPERIENCE",
    prep_question: "INTERVIEW QUESTION",
    transport: "TRANSPORT",
    service: "CAMPUS SERVICE",
    guide: "PROCESS GUIDE",
    place: "LOCAL PLACE",
    trip: "TRIP RECOMMENDATION",
    tip: "SURVIVAL TIP",
    expertise: "PEER EXPERTISE",
    mess: "MESS MENU",
  }[r.type] ?? r.type.toUpperCase()
  return `[${typeLabel}] ${r.title}: ${r.body}`
}).join("\n\n")

Now when a student asks "what should I do this weekend",
the RAG retrieves trip recommendations + survival tips +
upcoming events from notices — all in one query.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QA CHECKPOINT — Phase 21 (Final)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This is the full system integration test.
Every check below tests a CROSS-DOMAIN connection.

1. UNIFIED SEARCH:
   Query "Amazon interview preparation" → results must include
   AT LEAST ONE of each: Company row, InterviewExperience,
   PrepQuestion, ExpertiseSeed. All from one function call.

2. BURNOUT MODEL:
   Seed: 4 deadlines in next 48hrs + no peer activity 15 days +
   Amazon drive in 5 days with 2 skill gaps.
   computeCompositeBurnout → score must be > 7.
   primaryDriver must be "deadlineClusterScore" or
   "placementAnxietyScore" (highest individual signal).

3. MORNING BRIEFING cross-domain:
   With above seed data: briefing must mention BOTH the deadline
   cluster AND the Amazon skill gap in 2-3 sentences.
   Must NOT be two separate thoughts — must connect them.

4. ALERT: skill_gap_urgent fires when drive ≤3 days + missing skills.
   Fix the gaps (update ExpertiseSeed confidence to 2+).
   Alert must disappear on next computeAlerts call.

5. ALERT: cab_pool_available fires when placement drive exists
   AND open CabPoolRequest destination matches drive venue.

6. RAG CHAT:
   Ask "what should I eat tonight and do I have any upcoming deadlines?"
   Confirm context includes BOTH a MessMenu result AND a Deadline result.
   Confirm answer addresses both in one response.

7. Ask "help me prepare for Goldman Sachs in 4 days"
   Confirm context includes: company profile, interview experience,
   student's skill gap, peer with matching expertise.
   Answer must be specific to Goldman Sachs, not generic.

8. Burnout trajectory: seed 3 consecutive days of worsening signals.
   burnout.trajectory must be "worsening".
   Morning briefing must acknowledge the multi-day pattern,
   not just today's snapshot.

9. Full Ring 4 data fetch: all 9 Promise.allSettled calls complete.
   Mock ONE to reject. Confirm: briefing still generates using
   the 8 successful results. No 500. No empty briefing.

10. DEMO DAY SIMULATION (10 minutes):
    - Fresh DB with seed data
    - Load dashboard: briefing generates within 4 seconds
    - Alert panel shows placement skill gap alert
    - Navigate to /placement: skill gap card shows for Amazon
    - Click "Find peer for DSA gap" → peer learning pre-filled
    - Navigate to /transport → plan travel to Amazon office
    - Ask chat: "Am I ready for Amazon?" → specific answer
      referencing skill gaps + experiences + peer connections
    - Send Telegram message "Amazon drive tomorrow at Prestige Tower"
      → placement notice ingested → alert fires → briefing updates

Update PROJECT_CONTEXT.md:
  - Phase 21 [x] complete
  - Mark entire Ring 3 + Ring 4 complete
  - Document unified embedding search
  - Document burnout model weights and rationale
  - List all known limitations
  - Mark project as ecosystem-complete

Summary: What You're Building Phase by Phase
PhaseWhat Gets BuiltKey Unlock for Ring 4
15Company profiles + skill gapsPlacement-aware peer matching
16AI prep guides + personalized plansCross-domain study planning
17Transport + cab poolsInterview travel automation
18Campus services + process guidesService deadline alerts
19Food ratings + nutrition + group ordersNutrition in burnout model
20Local discovery + survival guideRecovery recommendations
21Ring 4 intelligence engineEverything talks to everything
Every phase independently adds value. 
Ring 4 in Phase 21 is the multiplier that makes the sum greater than the parts.