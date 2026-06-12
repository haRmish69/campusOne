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

## Architecture Decisions Log
- [2026-06-12] Adopted Calendly-inspired light theme (`DESIGN.md`) instead of default dark theme.
- [2026-06-12] Storing embeddings as JSON arrays in MySQL for in-memory cosine similarity to optimize for 35-hour hackathon speed.
- [2026-06-12] Downgraded Prisma to v5.x to support `url = env("DATABASE_URL")` natively in `schema.prisma`.

## Completed Phases
- [x] Phase 0: Context File Setup
- [x] Phase 1: Project Scaffold + Database Layer
- [x] Phase 2: AI Engine + Embedding Layer
- [x] Phase 3: Smart Notice Digester
- [x] Phase 4: RAG Q&A Pipeline + Chat Interface
- [x] Phase 5: Mess Menu Module
- [x] Phase 6: Deadline Brain
- [x] Phase 7: Class Schedule + AI Study Planner
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
- `scripts/test-ai.ts`: Verification script for keyword extraction and embeddings.
- `app/api/ingest/route.ts`: API endpoint to ingest images/text, parse via Gemini, and generate embeddings.
- `app/api/notices/route.ts`: API endpoint to fetch notices from DB.
- `components/NoticeCard.tsx`: Display component for notices.
- `components/FileUpload.tsx`: Drag and drop file upload and text pasting component.
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
- `app/api`, `components`, `lib`, `scripts`: Scaffolded directories.

## Known Issues / TODO
- (None yet)

## Environment & Setup Notes
- Expected env vars: `DATABASE_URL`, `GEMINI_API_KEY`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_TAGLINE`
