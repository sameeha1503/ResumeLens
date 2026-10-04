# ResumeLens

ResumeLens ranks resumes against a job description by evidence, not keywords, and flags unsupported or contradictory claims. It provides explainable, gaming-resistant AI resume screening.

## Features
- **Evidence-First Scoring**: Matches candidate skills with explicit requirements from a job description based on verifiable claims.
- **Robust Parsing**: Extracts data reliably from resumes in multiple formats (PDF, DOCX, TXT, images).
- **Security Scans**: Detects prompt injections, hidden text, and keyword stuffing.
- **Explainability**: Clear breakdowns of why a candidate received their score, along with generated interview questions.
- **Interactive Workspace**: Drag-and-drop file upload, real-time status updates, and customizable scoring weights.

## Tech Stack
- Frontend: TanStack Start, React, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Supabase (PostgreSQL with pgvector, Storage, Row Level Security)
- Build: Vite, Nitro
- Runtime: Node/Bun

## Setup

1. **Install Dependencies**
   Run the following to install all project packages:
   ```bash
   npm install
   # or bun install
   ```

2. **Environment Variables**
   Copy the example config:
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and configure your chosen AI provider (e.g., Gemini or OpenAI endpoints). 
   You must also connect your Supabase project in the dashboard and set the standard Supabase keys.

3. **Database Migration**
   Run the migration script to initialize the pgvector tables and policies in your Supabase instance.
   Check `drizzle/migrations/0000_migration.sql` for the schema.

4. **Run the App**
   Start the development server:
   ```bash
   npm run dev
   # or run start.bat on Windows
   ```

## How Scoring Works
The pipeline parses the resume, runs a security check, extracts structured data (skills, experience, etc.) using AI, matches the skills against the job description using vector embeddings, and calculates a final score based on configurable weights (skills, experience, education, evidence).

## Known Limitations
- Vector embeddings and AI extractions rely heavily on the performance and latency of the configured AI provider.
- Processing extremely large batches of resumes simultaneously may hit provider rate limits.

## AI Disclosure
- **AI Models**: This application heavily utilizes Large Language Models (LLMs) and embedding models for data extraction, skill matching, text generation, and explanation logic.
- **AI Assistance**: AI coding assistants helped build and maintain this project's source code.
