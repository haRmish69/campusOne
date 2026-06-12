# CampusFlow 🎓✨

**CampusFlow** is a next-generation, AI-powered digital assistant built for college students. By unifying disjointed campus information into a single, intelligent platform, it transforms how students manage their schedules, deadlines, mess menus, and official notices.

Powered by a custom in-memory Retrieval-Augmented Generation (RAG) system utilizing the **Gemini API**, CampusFlow acts as your personal, proactive campus assistant.

---

## 🌟 Key Features

### 1. Intelligent App Shell & Dashboard
- A sleek, unified interface greeting you dynamically based on the time of day.
- Get a birds-eye view of **Classes Today**, **Upcoming Deadlines**, and **Recent Notices** the moment you log in.
- A beautiful **Voice FAB** (Floating Action Button) is always one click away, ready to drop you into the AI chat from anywhere.

### 2. Conversational AI Chat (RAG)
- Ask natural language questions like *"What's for dinner on Tuesday?"* or *"When is my OS assignment due?"*
- Powered by an embedded vector search engine matching your queries against all ingested campus data.
- Supports **Voice Input** and ultra-fast Markdown **Streaming**.

### 3. The "Deadline Brain"
- Never miss a submission again. 
- Deadlines are automatically sorted chronologically.
- A dual-view UI separates active tasks from completed ones. Mark tasks complete with a satisfying check!

### 4. Class Schedule & AI Study Planner
- Upload a picture or text of your timetable, and Gemini maps out courses, rooms, and professors.
- **The Magic Button**: Click "Generate AI Study Plan" to have Gemini read your *actual* schedule alongside your *actual* pending deadlines, instantly streaming out a highly personalized, conflict-free weekly study strategy.

### 5. Smart Mess Menu & Notices
- Track what's cooking in the cafeteria (with clear Veg/Non-Veg indicators).
- Stay updated on campus events, placements, and hostel rules.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Database ORM**: [Prisma](https://www.prisma.io/) with MySQL
- **AI & Embeddings**: [Google Gemini API](https://ai.google.dev/) (`gemini-flash-latest`)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MySQL Database
- Gemini API Key

### Installation

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/your-username/campusflow.git
   cd campusflow
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up Environment Variables:**
   Create a \`.env\` file in the root directory and add your credentials:
   \`\`\`env
   DATABASE_URL="mysql://user:password@localhost:3306/campusflow"
   GEMINI_API_KEY="your_google_gemini_api_key_here"
   \`\`\`

4. **Initialize the Database:**
   Push the Prisma schema to your MySQL database:
   \`\`\`bash
   npx prisma db push
   \`\`\`

5. **Seed the Database (Optional but Recommended):**
   Populate your dashboard with realistic demo data instantly:
   \`\`\`bash
   npm run seed
   \`\`\`

6. **Start the Development Server:**
   \`\`\`bash
   npm run dev
   \`\`\`

7. **Open the App:**
   Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗 Architecture Highlight: In-Memory RAG
Instead of relying on heavy, expensive vector databases like Pinecone, CampusFlow utilizes a lightweight, extremely fast in-memory embedding search. 
1. When data is ingested (e.g. Mess Menu), Gemini generates a 200-dimensional vector.
2. Prisma stores this vector as a JSON array.
3. Upon asking a question, CampusFlow fetches all vectors into memory, calculates the Cosine Similarity instantly, and feeds the top results to the generative model.

---

*Designed and built with ❤️ by Antigravity & the User.*
