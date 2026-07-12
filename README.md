# AI Code Review & Security Analysis Agent

An intelligent multi-agent platform that automatically analyzes source code for quality issues, security vulnerabilities, and best-practice violations — with RAG-powered secure coding guidance.

## Features (Milestone 1)

- **Code Submission** — Paste or upload Python/Java source files with syntax validation
- **Secure Coding Knowledge Base** — OWASP guidelines and best practices indexed via RAG (LangChain + ChromaDB + BGE embeddings)
- **Architecture & Data Models** — Full system design documented in [ARCHITECTURE.md](./ARCHITECTURE.md)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, Tailwind CSS, shadcn/ui |
| Backend | FastAPI |
| AI / Agents | LangGraph, LangChain |
| LLM | Gemini 2.5 Flash / GPT |
| Embeddings | BAAI/bge-small-en-v1.5 |
| Vector DB | ChromaDB |
| Database | PostgreSQL + SQLAlchemy |

## Project Structure

```
AI-Code-Review-Agent/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/             # REST endpoints
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic
│   │   └── rag/             # RAG pipeline
│   └── knowledge_base/      # Secure coding documents
├── frontend/                # Next.js developer portal
├── ARCHITECTURE.md
└── docker-compose.yml       # PostgreSQL for local dev
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for PostgreSQL)

### 1. Database

**Option A — Local SQLite (no Docker needed, default):**

The backend uses SQLite by default. No setup required — the database file is created automatically at `backend/data/app.db`.

**Option B — PostgreSQL (production / Docker):**

```bash
docker compose up -d
```

Then set in `backend/.env`:
```
DATABASE_URL=postgresql://codereview:codereview@localhost:5432/code_review_agent
```

Or use a free [Neon](https://neon.tech) PostgreSQL instance for cloud deployment.

### 2. Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your DATABASE_URL and optional GEMINI_API_KEY

uvicorn app.main:app --reload --port 8000
```

Index the knowledge base (first run):

```bash
curl -X POST http://localhost:8000/api/v1/knowledge-base/index
```

API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local

npm run dev
```

Portal: http://localhost:3000

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GEMINI_API_KEY` | Google Gemini API key (optional for M1) |
| `CHROMA_PERSIST_DIR` | ChromaDB storage path |
| `KNOWLEDGE_BASE_DIR` | Path to knowledge base markdown files |
| `CORS_ORIGINS` | Allowed frontend origins |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL (default: http://localhost:8000) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/submissions/paste` | Submit pasted code |
| POST | `/api/v1/submissions/upload` | Upload a source file |
| GET | `/api/v1/submissions/{id}` | Get submission |
| POST | `/api/v1/knowledge-base/index` | Index knowledge base |
| GET | `/api/v1/knowledge-base/status` | Index stats |
| POST | `/api/v1/knowledge-base/query` | Query knowledge base |

## License

MIT
