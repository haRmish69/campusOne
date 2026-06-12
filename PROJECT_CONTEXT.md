# CampusFlow — Project Context

## Tech Stack (locked, do not change)
- Next.js 14+ App Router, TypeScript
- Tailwind CSS + shadcn/ui
- MySQL + Prisma ORM
- Google Gemini 1.5 Flash (@google/generative-ai)
- In-memory cosine similarity vector search (embeddings stored as JSON in MySQL)
- No external vector DB, no auth (single-user/admin demo)

## UI / Design System (locked)
- Theme: Light (Calendly-inspired)
- Typography: Gilroy (or fallback system fonts), Midnight Navy (#0b3558) for headlines, Carbon (#0a0a0a) for body.
- Accents: Signal Blue (#006bff) for primary CTAs.
- Elevation: Soft blue-tinted shadows, 4px radii on buttons, 16px on cards.
- Signature: Decorative gradient shapes (magenta/violet/amber/cyan blobs) behind UI mockups.
- *Note: This explicitly overrides the "dark theme" mentioned in Phase 8 of the original build plan.*

## Module 2: PocketBuddy (Financial & Wellness Assistant)
### Goal
Help students manage monthly expenses, get affordable food/travel
suggestions, detect burnout/stress patterns, encourage healthy routines,
and provide personalized financial + emotional support — fully integrated
into the existing CampusFlow nav, dashboard, and chat assistant.

### New Models (to be added to schema.prisma — see Phase 1B)
Expense, Budget, WellnessLog, WellnessInsight

### Phases
- [x] Phase 1B: PocketBuddy schema + nav integration
- [x] Phase 2B: Expense Tracker + AI categorization
- [x] Phase 3B: Budget + Smart Spending Suggestions
- [x] Phase 4B: Wellness Check-in + Burnout Detection
- [x] Phase 5B: Unified Dashboard + Cross-Module Chat (RAG)
- [x] Phase 6B: QA Checkpoint
- [x] Phase 7B: Proactive Cross-Domain Insights (Skipping meals detection)
- [x] Phase 8B: SOS / Overwhelmed Mode (Task Reprioritization & Breathing Animation)
- [x] Phase 9B: Smart Savings Engine (Budget Contextual AI)

## Module 3: Hyper-Personalized Peer Network
### Goal
Transition the app from a single-player tool to an institute-aware, hyper-personalized peer platform. Capture full academic profiles to supercharge the AI context and enable crowdsourced analytics and study group matchmaking.

### Phases
- [x] PRE-PHASE 10: Auth & Identity Check (Blocker Gate)
- [x] Phase 10: `UserProfile` Schema Update + Onboarding Modal
- [x] Phase 11: Hyper-Contextual RAG (injecting profile into AI memory)
- [x] Phase 12: The Campus Pulse (Crowdsourced Sentiment Aggregation)
- [x] Phase 13: Study Group Matchmaker (Weighted by profile similarity)
- [x] Phase 14: Demo Seed Data Generator (Env-gated)
- [x] Phase 14B: QA Tester Checkpoint

## Module 4: Peer Learning Ecosystem
### Goal
Build the full Peer Learning Ecosystem with passive expertise inference, smart matching, request/accept state machine, and contact reveal. Elevate "Find Study Peers" to a marquee feature.

### Phases
- [ ] Phase 11: Peer Learning Ecosystem (Schema, Inference Engine, Matcher, API, UI)

## Module 3 — Identity Decision
The current identity mechanism is **Clerk Authentication**. 
The application actively uses `auth()` from `@clerk/nextjs` to retrieve `userId`.
Therefore, the new model must be named `UserProfile`, and it must use `userId` (String) as the unique reference field to link to Clerk's identity system. All subsequent phases must use this `userId` to query the `UserProfile`.

## Architecture Decisions Log
- [2026-06-12] Adopted Calendly-inspired light theme (`DESIGN.md`) instead of default dark theme.
- [2026-06-12] Storing embeddings as JSON arrays in MySQL for in-memory cosine similarity to optimize for 35-hour hackathon speed.
- [2026-06-12] Downgraded Prisma to v5.x to support `url = env("DATABASE_URL")` natively in `schema.prisma`.
- [2026-06-13] Added WhatsApp Importer parsing logic. Decided to fallback to MM/DD/YYYY only if first part is clearly > 12, otherwise default to non-US DD/MM/YYYY for dates to handle varied WhatsApp export formats. Deduplication is handled via exact title match.
- [2026-06-13] Added PocketBuddy Module navigation with a subtle uppercase divider in the Sidebar to cleanly separate core campus features from personal financial/wellness tools without cluttering the UI.
- [2026-06-13] Completed Module 3: Hyper-Personalized Peer Network integration. Fixed LLM ingestion runtime bugs for Deadlines (date fallback logic and case-insensitive enum parsing). 
- [2026-06-13] Reverted "Modern Web Design" CSS overrides to preserve the intended Calendly-inspired light theme while keeping the newly integrated features (`CampusPulse`, `StudyGroupMatcher`, `OnboardingModal`).

## Completed Phases
- [x] Phase 0: Context File Setup
- [x] Phase 1: Project Scaffold + Database Layer
- [x] Phase 2: AI Engine + Embedding Layer
- [x] Phase 3: Smart Notice Digester
- [x] Phase 4: RAG Q&A Pipeline + Chat Interface
- [x] Phase 5: Mess Menu Module
- [x] Phase 6: Deadline Brain
- [x] Phase 7: Class Schedule + AI Study Planner
- [x] Phase 7.5A: WhatsApp Chat Export Importer
- [x] Phase 7.5B: Email Sync
- [x] Phase 8A: Voice FAB, Dashboard, Sidebar, Root Layout
- [x] Phase 8B: Seed Data + Demo Polish
- [x] Phase 9: README + Setup Validation

## File Inventory
- `PROJECT_CONTEXT.md`: Persistent memory and project roadmap.
- `prisma/schema.prisma`: Database schema containing the 6 primary data models.
- `lib/prisma.ts`: PrismaClient singleton for database connections.
- `.env.local.example`: Environment variable template.
- `lib/gemini.ts`: Wrapper for the Google Gemini API.
- `lib/embeddings.ts`: Logic for deterministic 200-d embeddings and cosine similarity.
- `lib/vectorStore.ts`: Cross-table search logic retrieving vectors from the database.
- `lib/whatsappParser.ts`: Regex parser for WhatsApp .txt exports handling multiple date formats.
- `lib/gmail.ts`: Utilities for fetching and parsing emails via Gmail API.
- `scripts/test-ai.ts`: Verification script for keyword extraction and embeddings.
- `scripts/test-whatsapp-parser.ts`: Test script to verify WhatsApp export parsing fixtures.
- `app/api/ingest/route.ts`: API endpoint to ingest images/text, parse via Gemini, and generate embeddings.
- `app/api/whatsapp/import/route.ts`: API endpoint to bulk process WhatsApp chat logs into Notices.
- `app/api/email/sync/route.ts`: API endpoint to sync labeled emails into Notices.
- `app/api/notices/route.ts`: API endpoint to fetch notices from DB.
- `components/NoticeCard.tsx`: Display component for notices (with WhatsApp/Email badges).
- `components/FileUpload.tsx`: Drag and drop file upload and WhatsApp import component.
- `components/SyncEmailButton.tsx`: Client component to trigger email sync.
- `app/notices/page.tsx`: UI shell for the notices module.
- `app/api/query/route.ts`: API endpoint for processing RAG queries and streaming AI responses.
- `app/api/chat/route.ts`: API endpoint for fetching chat history by sessionId.
- `components/ChatInterface.tsx`: The primary AI chat UI with Voice Input and Text-To-Speech.
- `app/chat/page.tsx`: Page wrapper for the chat interface.
- `app/api/mess/ingest/route.ts`: API endpoint to ingest and parse mess menus.
- `app/api/mess/route.ts`: API endpoint to fetch all mess menus.
- `components/MessCard.tsx`: Display component for individual meal menus.
- `app/mess/page.tsx`: UI shell for the Mess Menu module.
- `app/api/deadlines/ingest/route.ts`: API endpoint to ingest and parse deadlines.
- `app/api/deadlines/route.ts`: API endpoint to fetch all deadlines.
- `app/api/deadlines/[id]/route.ts`: API endpoint to toggle deadline completion.
- `components/DeadlineCard.tsx`: Display component for individual deadlines.
- `app/deadlines/page.tsx`: UI shell with Tabs for upcoming and completed deadlines.
- `app/api/schedule/ingest/route.ts`: API endpoint to ingest and parse schedules.
- `app/api/schedule/route.ts`: API endpoint to fetch all classes.
- `app/api/study-plan/route.ts`: API endpoint to stream an AI-generated study plan.
- `components/ClassCard.tsx`: Display component for individual classes.
- `app/schedule/page.tsx`: UI shell for weekly schedule and AI Study Planner.
- `app/expenses/page.tsx`: PocketBuddy Expenses tracking UI.
- `app/budget/page.tsx`: PocketBuddy Budget tracking UI.
- `app/wellness/page.tsx`: PocketBuddy Wellness check-in UI.
- `app/api`, `components`, `lib`, `scripts`: Scaffolded directories.

## Known Issues / TODO
- Email sync requires explicit Gmail OAuth configuration in the Google Cloud Console. Without `.env` variables, the sync button shows a graceful toast error but will not crash the app.
- WhatsApp exports missing a valid year or using completely non-standard separators might fallback to the current date during ingestion.

## Environment & Setup Notes
- Expected env vars: `DATABASE_URL`, `GEMINI_API_KEY`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_TAGLINE`
