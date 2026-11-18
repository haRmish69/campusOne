# CampusOne 🎓✨

> **Everything Campus. One Intelligent Platform.**

CampusOne is an AI-powered student companion designed to simplify academic life, campus management, and career preparation through one unified platform.

It brings together intelligent campus assistance, academic organization, placement preparation, and student resources to help students stay organized, make smarter decisions, and become career-ready.

Powered by Google's Gemini API, CampusOne combines AI-driven assistance, personalized recommendations, and intelligent data processing to create a smarter campus experience.

---

## 🌟 Key Features

### 1. 🧠 AI Campus Brain

Your personal AI-powered campus assistant.

- Ask questions about college notices, academic schedules, deadlines, and campus information.
- Upload and interact with academic documents.
- Get contextual answers using Retrieval-Augmented Generation (RAG).
- Access campus information through natural language conversations.
- Voice-enabled interaction for a more natural experience.
- Get assistance with academic planning and everyday campus activities.

### 2. 🚀 AI Placement Intelligence

An intelligent career preparation system that helps students understand their strengths, identify skill gaps, and prepare for real job opportunities.

**Resume & ATS Analyzer**
- Upload and analyze your resume.
- Evaluate resume quality and ATS compatibility.
- Identify missing keywords, weak sections, and improvement opportunities.
- Get AI-powered suggestions to improve your resume.

**AI Skill Gap Analyzer**
- Analyze skills extracted from your actual resume.
- Compare your skills against selected career roles and job requirements.
- Identify strong skills, intermediate skills, beginner-level skills, and missing skills.
- Receive personalized recommendations to improve employability.

**AI Career Roadmap**
- Generate personalized learning roadmaps based on your current skills.
- Identify technologies and competencies required for your target career.
- Get structured recommendations to improve career readiness.

**AI Job Matcher**
- Discover relevant job opportunities based on your resume and skills.
- Calculate compatibility using actual job requirements.
- Understand matching skills and missing qualifications.
- Track interesting opportunities and prepare for specific roles.

**Placement Readiness**
- Understand your current career preparation level.
- Identify areas that require improvement.
- Get actionable recommendations to become placement-ready.

### 3. 🎤 AI Mock Interview

Practice interviews with an AI-powered interviewer.

- Personalized interview questions.
- Resume and job-role-based interview preparation.
- Voice and text-based interview interaction.
- AI-powered answer evaluation.
- Feedback on communication, technical knowledge, and performance.
- Identify areas for improvement.

### 4. 📊 Intelligent Student Dashboard

A unified dashboard providing an overview of important academic and campus activities.

- Classes and daily schedules.
- Upcoming deadlines.
- Recent college notices.
- Important reminders.
- Quick access to campus tools and AI features.

### 5. 📅 Smart Academic Management

Manage your academic activities efficiently.

- Organize assignments and deadlines.
- Track completed and pending tasks.
- Manage class schedules and timetables.
- Generate personalized AI study plans.
- Keep important academic information organized.

### 6. 🍽️ Smart Mess Menu & Campus Notices

Stay informed about everyday campus activities.

- Access mess menus.
- View vegetarian and non-vegetarian food options.
- Stay updated with college announcements.
- Access important campus information and notices.

### 7. 📝 My Notes & Campus Ecosystem

Keep important information accessible in one place.

- Organize personal notes.
- Access useful campus resources.
- Explore student-focused tools and services.
- Keep academic and campus information organized.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Authentication | Clerk |
| Database | Neon PostgreSQL |
| AI Integration | Google Gemini API |
| Vector Search | Qdrant |
| ORM / Database Tools | Prisma |
| Icons | Lucide React |
| Development Environment | Antigravity, VS Code, Git |

---

## 🏗️ AI Architecture

### AI Campus Brain

CampusOne uses a Retrieval-Augmented Generation approach to provide context-aware responses.

**Processing Pipeline:**

1. Upload or collect relevant campus documents.
2. Extract and process document content.
3. Divide content into meaningful chunks.
4. Generate embeddings.
5. Retrieve relevant information using semantic search.
6. Provide retrieved context to Gemini.
7. Generate relevant, context-aware responses.

### AI Placement Intelligence

The placement system uses resume information and job requirements to generate personalized career insights.

**Processing Pipeline:**

1. Upload resume (PDF).
2. Extract and parse resume information.
3. Identify skills, experience, education, and projects.
4. Compare extracted information against target roles and job requirements.
5. Calculate relevant skill matches.
6. Generate AI-powered analysis and recommendations.
7. Provide personalized career preparation insights.

The analyzed resume information can be reused across placement features, reducing the need to upload the same resume repeatedly.

---

## 🚀 Getting Started

### Prerequisites

- Node.js
- npm
- Git
- Clerk account and credentials
- Neon PostgreSQL database
- Google Gemini API key
- Qdrant configuration, if required by the application

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/haRmish69/campusOne.git
cd campusOne
```

**2. Install dependencies**

```bash
npm install
```

**3. Configure environment variables**

Create a `.env.local` file in the project root.

Add the credentials required by your application, including the relevant Clerk, Neon PostgreSQL, Gemini, and Qdrant configuration.

Never upload your actual API keys, database passwords, or secret credentials to GitHub.

**4. Initialize the database**

Run the appropriate Prisma database commands for your configured database:

```bash
npx prisma generate
npx prisma db push
```

**5. Start the development server**

```bash
npm run dev
```

**6. Open the application**

Visit:

```text
http://localhost:3000
```

---

## 🎯 Project Vision

CampusOne aims to bring the entire student journey into one intelligent ecosystem.

From managing daily college activities to preparing for placements, students can access the tools and insights they need without switching between multiple disconnected platforms.

**One Platform. Smarter Campus Life. Better Career Opportunities.**

---

## 👨‍💻 Developed By

Designed and developed with ❤️ using AI-powered development tools and modern web technologies.

**Project:** CampusOne

**GitHub:** https://github.com/haRmish69/campusOne
