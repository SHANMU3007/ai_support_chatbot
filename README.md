# AI Customer Support Chatbot SaaS Platform

A full-stack, multi-tenant SaaS platform where any business can upload their knowledge base (FAQs, PDFs, DOCX files, or website URLs) and instantly get a branded, embeddable AI chatbot powered by **Groq** (llama-3.3-70b-versatile) with RAG (Retrieval-Augmented Generation). The chatbot can be dropped onto any external website with a single `<script>` tag.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [How Everything Connects (Data Flow)](#3-how-everything-connects-data-flow)
4. [Frontend — Next.js 14 Dashboard](#4-frontend--nextjs-14-dashboard)
5. [Backend — FastAPI AI Engine](#5-backend--fastapi-ai-engine)
   - [RAG Service](#rag-service)
   - [AI Engine](#ai-engine)
   - [Embedding Service](#embedding-service)
   - [ChromaDB Service](#chromadb-service)
   - [Document Processor](#document-processor)
   - [URL Scraper](#url-scraper)
   - [Language Service](#language-service)
   - [NL2SQL Service](#nl2sql-service)
6. [Database — PostgreSQL + Prisma](#6-database--postgresql--prisma)
7. [Vector Database — ChromaDB](#7-vector-database--chromadb)
8. [Cache — Redis](#8-cache--redis)
9. [Automation — n8n Workflows](#9-automation--n8n-workflows)
10. [Embed Widget](#10-embed-widget)
11. [Authentication — NextAuth.js](#11-authentication--nextauthjs)
12. [Infrastructure — Docker Compose](#12-infrastructure--docker-compose)
13. [API Reference](#13-api-reference)
14. [Environment Variables](#14-environment-variables)
15. [Quick Start](#15-quick-start)

---

## 1. Architecture Overview

```
┌─────────────────────── User's Browser ───────────────────────────┐
│                                                                   │
│  ┌─────────────────────────────┐    ┌───────────────────────┐    │
│  │  Next.js Dashboard          │    │  Embed Widget         │    │
│  │  (Port 3000)                │    │  (any 3rd-party site) │    │
│  │  - Chatbot management       │    │  <script src=...>     │    │
│  │  - Knowledge upload         │    │  Loads iframe →       │    │
│  │  - Analytics                │    │  /chat/{botId}        │    │
│  └──────────┬──────────────────┘    └──────────┬────────────┘    │
└─────────────┼────────────────────────────────  ┼ ─────────────── ┘
              │ Next.js API Routes                │ SSE Stream
              ▼                                   ▼
┌─────────────────────── Server Layer ─────────────────────────────┐
│                                                                   │
│  ┌───────────────────────┐    ┌─────────────────────────────┐   │
│  │  PostgreSQL + Prisma  │    │  FastAPI AI Engine           │   │
│  │  (Port 5432)          │    │  (Port 8000)                 │   │
│  │  - Users, Chatbots    │    │  - /chat/message (SSE)       │   │
│  │  - Documents          │    │  - /ingest/document          │   │
│  │  - Sessions/Messages  │    │  - /ingest/faq               │   │
│  └───────────────────────┘    │  - /ingest/url               │   │
│                               │  - /embeddings/query         │   │
│  ┌───────────────────────┐    └──────────┬────────────────── ┘   │
│  │  Redis (Port 6379)    │               │                       │
│  │  - Session cache      │    ┌──────────▼────────────────────┐  │
│  │  - Rate limiting      │    │  ChromaDB (Port 8001)         │  │
│  └───────────────────────┘    │  - Per-chatbot vector store   │  │
│                               │  - Cosine similarity search   │  │
│  ┌───────────────────────┐    └───────────────────────────────┘  │
│  │  n8n (Port 5678)      │                                       │
│  │  - Webhooks           │    ┌───────────────────────────────┐  │
│  │  - Email alerts       │    │  Groq Inference API           │  │
│  │  - CRM integration    │    │  (llama-3.3-70b-versatile)    │  │
│  └───────────────────────┘    └───────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | Next.js 14 (App Router) + TypeScript | Server components, streaming, file-based routing |
| Styling | Tailwind CSS + shadcn/ui | Utility-first CSS, accessible pre-built components |
| Backend | Python FastAPI | Async-native, perfect for streaming AI responses |
| AI Model | Groq (`llama-3.3-70b-versatile`) | Ultra-fast LPU inference, 14,400 free req/day |
| Embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) | Fast, local, no API cost for embeddings |
| Vector DB | ChromaDB | Simple, self-hosted, persistent vector store |
| Relational DB | PostgreSQL 15 + Prisma ORM | Structured data, migrations, type-safe queries |
| Cache | Redis 7 | Session storage, rate limiting |
| Automation | n8n (self-hosted) | No-code workflow automation |
| Auth | NextAuth.js | Google + Email/Password sign-in |
| Containers | Docker + Docker Compose | One-command startup of all services |

---

## 3. How Everything Connects (Data Flow)

### Knowledge Ingestion Flow

```
Business uploads file / FAQ / URL
        │
        ▼
Next.js API route (/api/knowledge/*)
        │  Creates Document record in PostgreSQL (status=PENDING)
        │  Fire-and-forgets to FastAPI
        ▼
FastAPI /ingest/* endpoint
        │
        ├─ PDF/DOCX/TXT ──► DocumentProcessor (PyMuPDF / python-docx)
        ├─ FAQ pairs ─────► Formats as "Q: ... \nA: ..."
        └─ URL ───────────► URLScraper (httpx + BeautifulSoup)
        │
        ▼
TextSplitter → overlapping chunks (e.g. 512 tokens, 50 overlap)
        │
        ▼
EmbeddingService → sentence-transformers → float[] vectors
        │
        ▼
ChromaDB → stored in collection `bot_{chatbotId}` with metadata
```

### Chat Response Flow

```
Visitor types a message
        │
        ▼
FastAPI POST /chat/message
        │
        ▼
EmbeddingService → embed the question → float[] vector
        │
        ▼
ChromaDB → cosine similarity search → top-5 relevant chunks
        │
        ▼
AIEngine → system prompt (chunks as context) + conversation history
        │
        ▼
Groq API → llama-3.3-70b streams tokens back
        │
        ▼
FastAPI → Server-Sent Events (SSE) stream → Browser
```

---

## 4. Frontend — Next.js 14 Dashboard

**Location:** `frontend/`  
**Port:** 3000

The frontend is a Next.js 14 App Router application. It handles everything a business owner interacts with.

### Pages & Features

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login`, `/register` | Auth pages (NextAuth) |
| `/dashboard` | Overview: total chatbots, messages, sessions |
| `/chatbot` | List all chatbots |
| `/chatbot/create` | Create a new chatbot with name, persona, colors |
| `/chatbot/[id]/training` | Upload knowledge: FAQs, files, URLs |
| `/chatbot/[id]/embed` | Get the `<script>` embed code |
| `/conversations` | Browse all chat sessions and messages |
| `/analytics` | Charts: messages over time, top topics |
| `/chat/[botId]` | The public-facing chat window (used in the embed iframe) |

### Key Frontend Components

- **`DocumentUploader`** — Drag-and-drop file upload (PDF, DOCX, TXT up to 20 MB). Sends `multipart/form-data` to `/api/knowledge/upload`.
- **`FAQEditor`** — Add/remove Q&A pairs inline. Sends JSON array to `/api/knowledge/faq`.
- **`URLScraper`** — Enter a URL to scrape. Sends to `/api/knowledge/url`.
- **`useChat` hook** — Reads the SSE stream from FastAPI and appends tokens to the message in real time.
- **`providers.tsx`** — Wraps the entire app in `SessionProvider` (NextAuth) and `ThemeProvider`.

### How Next.js API Routes Work Here

Next.js API routes (`app/api/*/route.ts`) act as a **secure middleware layer**:
1. Verify the session (NextAuth `getServerSession`).
2. Check resource ownership against PostgreSQL via Prisma.
3. Create/read relational records.
4. Forward AI/embedding work to FastAPI (fire-and-forget for ingestion, proxied stream for chat).

This keeps secrets (database credentials, API keys) server-side and prevents direct public access to FastAPI.

---

## 5. Backend — FastAPI AI Engine

**Location:** `backend/`  
**Port:** 8000

The FastAPI backend is the pure AI engine. It handles all compute-heavy work: embedding generation, vector search, document parsing, and Groq LLM streaming.

### Routers

| Router | Base Path | Purpose |
|--------|-----------|---------|
| `chat.py` | `/chat` | Stream AI responses via SSE |
| `ingest.py` | `/ingest` | Process and embed knowledge documents |
| `embeddings.py` | `/embeddings` | Direct vector query endpoint |
| `health.py` | `/health` | Liveness/readiness probe |

---

### RAG Service

**File:** `app/services/rag_service.py`

RAG (Retrieval-Augmented Generation) is the core AI pattern this platform uses. It solves the problem of the AI model not having knowledge of your specific business.

**How it works:**
1. The incoming user question is converted to a vector (embedding).
2. ChromaDB finds the 5 most semantically similar chunks from the chatbot's knowledge base.
3. Those chunks are injected into the AI engine's system prompt as `Context`.
4. The AI answers using only that context — it cannot hallucinate facts from outside it.

```
Question → embed → [0.23, -0.11, 0.87, ...] → ChromaDB search
→ ["We're open 9-5 EST", "Returns accepted within 30 days", ...]
→ AI: "Based on the context: We're open 9am–5pm EST..."
```

---

### AI Engine

**File:** `app/services/ai_engine.py`

Wraps the Groq Python SDK. Uses **async streaming** so tokens arrive at the browser as the model generates them — no waiting for the full response.

Key behaviours:
- Uses `llama-3.3-70b-versatile` model via Groq LPU hardware (~500 tokens/sec).
- Keeps the last **6 conversation turns** in the message history for context continuity.
- System prompt strictly instructs the model to use only the provided context, preventing hallucination.
- Max output: **2048 tokens** per response (configurable).
- Streams via `AsyncGroq.chat.completions.create(stream=True)` → yields text chunks → SSE events.

---

### Embedding Service

**File:** `app/services/embedding_service.py`

Converts text into fixed-size float vectors using the `all-MiniLM-L6-v2` model from `sentence-transformers`.

**How embeddings work:**  
A vector embedding is a list of ~384 numbers that captures the *semantic meaning* of a sentence. Similar sentences produce vectors that are close together in space (low cosine distance). This allows ChromaDB to find "What are your hours?" in the knowledge base even if it was stored as "We are open Monday to Friday, 9am–5pm".

- Model loads **once** at startup, cached as a class variable.
- Encoding runs in a thread pool executor (`loop.run_in_executor`) to avoid blocking the async event loop.
- Used for both ingestion (embed chunks) and retrieval (embed query).

---

### ChromaDB Service

**File:** `app/services/chroma_service.py`

Manages the vector store. Each chatbot gets its **own isolated collection** named `bot_{chatbotId}`.

**Operations:**
- `add_chunks` — upserts text chunks + their embeddings + metadata (`document_id`, `chunk_index`).
- `query` — takes a query embedding, returns the top-N most similar chunks using **cosine similarity**.
- `delete_document` — removes all chunks belonging to a document (used when a document is deleted).

**Why per-chatbot collections?**  
Isolation ensures that Bot A never retrieves context from Bot B's knowledge base, even within the same ChromaDB instance.

---

### Document Processor

**File:** `app/services/document_processor.py`

Extracts raw text from uploaded files:

| File Type | Library | How |
|-----------|---------|-----|
| `.pdf` | PyMuPDF (`fitz`) | Page-by-page text extraction |
| `.docx` | `python-docx` | Iterates paragraphs |
| `.txt` | Built-in | UTF-8 decode |

After extraction, text is passed to `TextSplitter` which cuts it into overlapping chunks (e.g. 512 tokens with 50-token overlap). Overlapping ensures that sentences spanning a chunk boundary are still found during retrieval.

---

### URL Scraper

**File:** `app/services/url_scraper.py`

Fetches a web page and extracts its readable text content:

1. **`httpx`** fetches the page (async HTTP client, follows redirects, 15s timeout).
2. **`BeautifulSoup`** parses the HTML.
3. Removes boilerplate: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`.
4. Extracts clean line-by-line text.

The scraped text is then chunked and embedded exactly like an uploaded document.

---

### Language Service

**File:** `app/services/language_service.py`

Provides automatic language detection and translation using the Groq AI engine:

- **`detect_language(text)`** — uses `langdetect` library to return the ISO 639-1 code (`"en"`, `"fr"`, `"de"`, etc.).
- **`translate(text, target_lang)`** — uses Groq to translate text and return only the translated output.

This enables multilingual support: a visitor can write in French, the system detects it, processes in English, and translates the response back.

---

### NL2SQL Service

**File:** `app/services/nl2sql_service.py`

Lets business owners query their own analytics data in plain English:

**Example:** *"How many conversations did I have this week?"*  
→ AI generates: `SELECT COUNT(*) FROM chat_sessions WHERE chatbot_id IN (...) AND started_at >= NOW() - INTERVAL '7 days'`  
→ Executes against PostgreSQL → returns results as JSON

**Safety measures:**
- The AI engine is given a schema hint with only the permitted tables.
- A regex check enforces that only `SELECT` statements are executed — no `INSERT`, `UPDATE`, `DELETE`, or `DROP`.
- Queries are always scoped to the requesting `user_id`.

---

## 6. Database — PostgreSQL + Prisma

**Port:** 5432  
**ORM:** Prisma (TypeScript, used in Next.js)

### Schema Overview

```
User
 └── Chatbot (many)
      ├── Document (many)       ← uploaded knowledge
      └── ChatSession (many)
           └── Message (many)   ← conversation history
```

### Key Models

| Model | Key Fields | Purpose |
|-------|-----------|---------|
| `User` | `email`, `plan` | Account owner (FREE/STARTER/PRO/ENTERPRISE) |
| `Chatbot` | `name`, `systemPrompt`, `primaryColor`, `welcomeMessage`, `language` | Chatbot configuration |
| `Document` | `type` (FAQ/PDF/URL/TEXT/DOCX), `status` (PENDING/PROCESSING/DONE/FAILED), `chunkCount` | Knowledge source tracking |
| `ChatSession` | `visitorId`, `language` | Groups messages from one visitor session |
| `Message` | `role` (USER/ASSISTANT), `content`, `tokens`, `confidence` | Individual chat messages |

### How Prisma Works

Prisma is a type-safe ORM. You define your schema in `prisma/schema.prisma`, run `prisma migrate dev` to apply SQL migrations, and use the generated `PrismaClient` in TypeScript with full auto-complete.

---

## 7. Vector Database — ChromaDB

**Port:** 8001 (mapped from container's 8000)  
**Persistence:** Docker volume `chroma_data`

ChromaDB is a purpose-built vector database. Unlike PostgreSQL which stores rows and does exact lookups, ChromaDB stores **embeddings** and does **approximate nearest-neighbour (ANN) search**.

**How cosine similarity works:**  
Each chunk in the database is a point in 384-dimensional space. When a user asks a question, it becomes a point too. ChromaDB uses the **HNSW (Hierarchical Navigable Small World)** algorithm to efficiently find the closest points without scanning every single stored vector.

**Collections:** One per chatbot, named `bot_{chatbotId}`. Each item in the collection has:
- An `id` (`{documentId}_{chunkIndex}`)
- The raw text (`document`)
- The embedding vector (`embedding`)
- Metadata: `{ document_id, chunk_index }`

---

## 8. Cache — Redis

**Port:** 6379

Redis is an in-memory key-value store used for:
- **Session caching** — NextAuth stores session tokens in Redis for fast lookup.
- **Rate limiting** — Preventing abuse of the chat endpoint.

Redis is ephemeral by design — it's fast because it lives in RAM. The Docker volume `redis_data` persists data across restarts.

---

## 9. Automation — n8n Workflows

**Port:** 5678  
**Location:** `n8n-workflows/`

n8n is a self-hosted workflow automation tool (like Zapier, but self-hosted). Four pre-built workflows are included:

| Workflow | Trigger | Action |
|----------|---------|--------|
| `new-conversation-alert.json` | Webhook — new chat session starts | Emails the chatbot owner |
| `escalation-to-human.json` | Webhook — visitor requests human help | Emails support team + posts to Slack |
| `daily-report-email.json` | Cron — 08:00 every day | Fetches analytics API → emails daily summary |
| `lead-capture-crm.json` | Webhook — lead captured in chat | Creates a contact in your CRM via API |

**How n8n works:**  
Your Next.js backend sends a `POST` request to n8n's webhook URL when an event occurs. n8n receives it, runs through its visual workflow graph (HTTP requests, email nodes, conditional logic), and completes the automation — all without writing code.

**Import instructions:**  
1. Open `http://localhost:5678`
2. Workflows → Import from File → select each `.json` file

---

## 10. Embed Widget

**Files:** `embed/`, `frontend/public/embed.js`, `frontend/src/lib/embed-script.ts`

The embed widget allows any business to put their chatbot on any website with one line of HTML:

```html
<script src="https://your-app.com/embed.js?bot=YOUR_BOT_ID"></script>
```

**How it works:**

1. The script tag dynamically injects into the host page:
   - A floating **chat button** (fixed bottom-right, 56×56px circle in the chatbot's brand color).
   - A hidden **iframe container** (380×560px, slides in on click).
2. The iframe loads `/chat/{botId}` — the public chat page from the Next.js app.
3. All AI logic happens inside the iframe. The host page is never touched beyond the button and iframe.
4. Mobile responsive: on screens < 480px the iframe expands to near-full-screen.

The `embed/` directory contains a separate **Vite + React build** for a more feature-rich embeddable widget (`ChatWidget.tsx`), which can be built separately with `npm run build` inside `embed/`.

---

## 11. Authentication — NextAuth.js

**File:** `frontend/src/lib/auth.ts`

NextAuth.js handles authentication with two providers:
- **Google OAuth** — sign in with Google account.
- **Email/Password** — traditional credentials login.

Sessions are stored in PostgreSQL (via the Prisma adapter) and cached in Redis. The `getServerSession(authOptions)` call in every API route verifies the session server-side — the client never has direct database access.

**Middleware** (`middleware.ts`) protects all `/dashboard/*` routes, redirecting unauthenticated users to `/login`.

---

## 12. Infrastructure — Docker Compose

**File:** `docker-compose.yml`

All services run via Docker Compose. Every service has a **healthcheck** so that dependent services wait until their dependencies are truly ready.

| Service | Image | Port | Data Volume |
|---------|-------|------|-------------|
| `postgres` | `postgres:15-alpine` | 5432 | `postgres_data` |
| `redis` | `redis:7-alpine` | 6379 | `redis_data` |
| `chromadb` | `chromadb/chroma:0.5.23` | 8001 | `chroma_data` |
| `n8n` | `n8nio/n8n:latest` | 5678 | `n8n_data` |

The Next.js frontend and FastAPI backend run **outside** Docker in development (`npm run dev` and `uvicorn`) for fast hot-reload. In production, both have `Dockerfile` and `Dockerfile.dev` for containerised deployment.

---

## 13. API Reference

### FastAPI (Port 8000)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/chat/message` | Stream AI response (SSE). Body: `{ chatbot_id, session_id, message, history, visitor_id }` |
| `POST` | `/ingest/document` | Ingest uploaded file. Form: `chatbot_id`, `document_id`, `file` |
| `POST` | `/ingest/faq` | Ingest FAQ pairs. Body: `{ chatbot_id, document_id, pairs: [{question, answer}] }` |
| `POST` | `/ingest/url` | Scrape and ingest URL. Body: `{ chatbot_id, document_id, url }` |
| `DELETE` | `/ingest/document/{chatbot_id}/{document_id}` | Remove a document's embeddings from ChromaDB |
| `GET` | `/health` | Health check |

### Next.js API Routes (Port 3000)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/chatbot` | Create a new chatbot |
| `GET/PATCH/DELETE` | `/api/chatbot/[id]` | Get, update, or delete a chatbot |
| `POST` | `/api/knowledge/upload` | Upload a file (PDF/DOCX/TXT) |
| `POST` | `/api/knowledge/faq` | Submit FAQ pairs |
| `POST` | `/api/knowledge/url` | Submit a URL to scrape |
| `DELETE` | `/api/knowledge/[id]` | Delete a knowledge document |
| `POST` | `/api/chat` | Proxy chat request to FastAPI |
| `GET` | `/api/embed/[botid]` | Return embed script for a chatbot |
| `POST` | `/api/webhooks/n8n` | Receive n8n webhook callbacks |

---

## 14. Environment Variables

Create a `.env` file in the root (copied from `.env.example`):

```env
# ── GROQ (AI Inference Engine) ─────────────────────────────────────
GROQ_API_KEY=gsk_...

# ── Database ──────────────────────────────────────────────────────
POSTGRES_USER=chatbot
POSTGRES_PASSWORD=chatbot_pass
POSTGRES_DB=chatbot_db
DATABASE_URL=postgresql://chatbot:chatbot_pass@localhost:5432/chatbot_db

# ── Next.js / Auth ────────────────────────────────────────────────
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-random-secret-here
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── FastAPI ───────────────────────────────────────────────────────
FASTAPI_URL=http://localhost:8000

# ── Redis ─────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── ChromaDB ──────────────────────────────────────────────────────
CHROMA_HOST=localhost
CHROMA_PORT=8001

# ── n8n ───────────────────────────────────────────────────────────
N8N_USER=admin
N8N_PASSWORD=n8n_pass
N8N_WEBHOOK_URL=http://localhost:5678
```

---

## 15. Quick Start

### Prerequisites

- Docker Desktop
- Node.js 18+
- Python 3.11+
- A Groq API key ([get one free here](https://console.groq.com/keys))

### 1. Clone & Configure

```bash
git clone https://github.com/yourusername/ai-support-chatbot.git
cd ai-support-chatbot
cp .env.example .env
# Edit .env and set GROQ_API_KEY and NEXTAUTH_SECRET
```

### 2. Start Infrastructure (Docker)

```bash
docker compose up -d
# Starts: PostgreSQL, Redis, ChromaDB, n8n
```

### 3. Start the Frontend

```bash
cd frontend
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
# → http://localhost:3000
```

### 4. Start the Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # Mac/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

### 5. Open the App

Visit http://localhost:3000 and sign in.

- Create a chatbot → fill in name, brand colors, welcome message.
- Go to **Training** → upload a PDF, add FAQs, or enter a website URL.
- Wait ~10 seconds for ingestion → go to **Embed** → copy the script tag.
- Paste it into any HTML page and chat with your AI assistant.

### Makefile Shortcuts

```bash
make dev        # Start all Docker services
make migrate    # Run Prisma migrations
make seed       # Seed demo data
make logs       # Tail all service logs
make stop       # Stop all services
```

---

