# 🤖 AI Customer Support Chatbot SaaS — Complete Full-Stack Codebase Analysis & Technical Master Guide

> **Version**: 1.0.0  
> **Last Updated**: 2026-08-25  
> **Target Audience**: Technical Interviewers, System Architects, Onboarding Engineers, and Core Maintainers.

---

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Complete Architecture](#2-complete-architecture)
3. [Folder & File Structure](#3-folder--file-structure)
4. [Frontend Analysis](#4-frontend-analysis)
5. [Backend Analysis](#5-backend-analysis)
6. [API Documentation](#6-api-documentation)
7. [Database Analysis](#7-database-analysis)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Multi-Tenancy](#9-multi-tenancy)
10. [AI / ML Architecture](#10-ai--ml-architecture)
11. [Document Processing](#11-document-processing)
12. [External Services & APIs](#12-external-services--apis)
13. [Environment Variables](#13-environment-variables)
14. [Docker & Deployment](#14-docker--deployment)
15. [Complete User Journey](#15-complete-user-journey)
16. [Code-Level Dependency Analysis](#16-code-level-dependency-analysis)
17. [Error Handling](#17-error-handling)
18. [Security Analysis](#18-security-analysis)
19. [Performance Analysis](#19-performance-analysis)
20. [Testing](#20-testing)
21. [Project Strengths & Weaknesses](#21-project-strengths--weaknesses)
22. [Interview Preparation (30s, 1m, 3m)](#22-interview-preparation)
23. [Technical Interview Questions & Answers](#23-technical-interview-questions--answers)
24. ["Why Did You Use This?" Technology Justifications](#24-why-did-you-use-this-technology-justifications)
25. [Important Things You MUST Memorize](#25-important-things-you-must-memorize)
26. [Final Project Cheat Sheet](#26-final-project-cheat-sheet)

---

## 1. Project Overview

### 💡 Elevator Pitch (Simple Explanation for Interviewers)
> *"This project is an enterprise-grade, multi-tenant AI Customer Support SaaS platform. It enables any business or organization to train custom AI agents on their proprietary knowledge base—including PDFs, Word documents, static websites, and dynamic JavaScript single-page applications—in under 60 seconds. The system streams answers at ~500 tokens/second using Groq LPU hardware, enforces strict zero-hallucination grounding with ChromaDB vector search, supports regional voice input and 13+ languages, redacts sensitive PII in real-time, escalates frustrated customer interactions via n8n automation, and allows administrators to query platform analytics using conversational plain English (NL2SQL)."*

### 🎯 Main Purpose & Problem Solved
Traditional customer support operations face high staffing costs, slow response times, and repetitive inquiries. Standard generic AI chatbots suffer from hallucinations, high cloud inference latency, and lack of enterprise privacy compliance.

This platform solves these problems through:
1. **Instant Multi-Modal Knowledge Ingestion**: Seamless extraction and indexing of documents (PDF, DOCX, TXT) and web URLs (both static HTML and dynamic client-side JS apps).
2. **Strict Grounding (RAG)**: Chunks retrieved from ChromaDB are filtered with a minimum cosine similarity threshold ($min\_similarity \ge 0.25$), preventing the LLM from fabricating answers.
3. **Sub-Second Streaming Inference**: Powered by Groq's specialized LPU hardware running `llama-3.3-70b-versatile`.
4. **Omnichannel Delivery**: Standalone drop-in `<script>` web widget, direct Telegram Bot API integration, and interactive web sandbox.
5. **Real-Time PII Redaction & Zero-Retention**: Automated regex masking of credit cards, emails, SSNs, API keys, and passwords before database storage, plus an ephemeral zero-retention mode.
6. **Conversational Analytics (NL2SQL)**: Natural language to SQL query generation cached in Redis for fast metrics analysis.

### 👥 Target Users
- **E-Commerce & SaaS Businesses**: Automating customer support, product specs, and FAQ resolution.
- **Enterprise Support Teams**: Automated triage and routing of negative-sentiment conversations to human agents.
- **Digital Agencies**: Deploying white-labeled AI concierges for multiple client domains.

### 🛠️ Technology Stack Breakdown
| Category | Technology |
| :--- | :--- |
| **Frontend Framework** | [Next.js 14.2.14](file:///d:/ai-support-chatbot/frontend/package.json) (App Router, Server Actions, Route Handlers) |
| **Frontend Language & UI** | TypeScript 5.6, React 18.3, Tailwind CSS 3.4, Radix UI Primitives, Lucide React, Framer Motion, Three.js / React Three Fiber |
| **Backend Framework** | [Python 3.11+ FastAPI](file:///d:/ai-support-chatbot/backend/main.py), Uvicorn ASGI Server, Pydantic v2 |
| **Relational Database** | PostgreSQL 15 (Managed via Prisma ORM on frontend, SQLAlchemy 2.0 / asyncpg on backend) |
| **Vector Database** | [ChromaDB 0.5.11](file:///d:/ai-support-chatbot/backend/app/services/chroma_service.py) (Persistent HNSW Cosine Vector Store) |
| **Embedding Engine** | `fastembed` (`sentence-transformers/all-MiniLM-L6-v2` running on ONNX Runtime) |
| **LLM Inference** | [Groq SDK](file:///d:/ai-support-chatbot/backend/app/services/ai_engine.py) (`llama-3.3-70b-versatile` / `gpt-oss-120b`, fallback to `gpt-oss-20b` / `qwen3.6-27b`), Anthropic Claude Service |
| **Caching & Queue** | Redis 7 Alpine (NL2SQL result caching with SHA-256 keys, 5-min TTL) |
| **Authentication** | [NextAuth.js v4](file:///d:/ai-support-chatbot/frontend/src/lib/auth.ts) (Prisma Adapter, Google OAuth, Email Magic Links, JWT session strategy) |
| **Payments** | Razorpay Node SDK (Order creation, webhook & HMAC-SHA256 signature verification) |
| **Scraping Tools** | Playwright (Headless Chromium for JS-heavy SPAs), BeautifulSoup4, Requests |
| **Automation** | [n8n](file:///d:/ai-support-chatbot/docker-compose.yml) (Escalation triggers, Daily Analytics Digest, CRM ticket sync) |
| **Deployment & Containers**| Docker, Docker Compose, Railway configurations |

---

## 2. Complete Architecture

### 🔄 End-to-End System Flow Diagram

```mermaid
graph TD
    subgraph Clients & Channels
        W[Website Visitor / Embed Widget]
        T[Telegram User]
        A[Admin / Workspace User]
    end

    subgraph Frontend Layer (Next.js 14 :3000)
        UI[Next.js App Router UI]
        API_GW[Next.js Route Handlers / Proxies]
        AUTH[NextAuth.js Authentication]
        PRIVACY[PII Redactor & Zero-Retention Enforcer]
    end

    subgraph Backend Core (FastAPI :8000)
        ROUTER[FastAPI Endpoint Router]
        LANG[Language & Sentiment Engine]
        RAG[RAG Retrieval & Orchestration]
        NL2SQL[NL2SQL Analytics Engine]
        SCRAPERS[Playwright & BS4 Scrapers]
    end

    subgraph AI & Inference
        GROQ[Groq LPU API<br/>llama-3.3-70b-versatile]
        CLAUDE[Anthropic Claude API<br/>Fallback Tier]
        EMBED_MODELS[FastEmbed / sentence-transformers]
    end

    subgraph Data Stores & Workflows
        PG[(PostgreSQL Database)]
        CHROMA[(ChromaDB Vector Store)]
        REDIS[(Redis Cache)]
        N8N[n8n Automation Engine]
    end

    W -->|Chat Interaction / Voice| API_GW
    T -->|Webhook Updates| ROUTER
    A -->|Manage Bots / View Stats| UI
    UI -->|API Requests| API_GW
    API_GW --> PRIVACY
    PRIVACY -->|HTTP / SSE Forwarding| ROUTER

    ROUTER --> LANG
    ROUTER --> RAG
    ROUTER --> NL2SQL
    ROUTER --> SCRAPERS

    RAG -->|Similarity Search| CHROMA
    CHROMA -->|Context Chunks| RAG
    RAG -->|Grounded Prompt| GROQ
    GROQ -.->|Rate Limit Fallback| CLAUDE
    GROQ -->|Server-Sent Events SSE| ROUTER
    ROUTER -->|SSE Stream| API_GW
    API_GW -->|Stream Tokens| W

    API_GW -->|Prisma ORM CRUD| PG
    ROUTER -->|SQL Logging & Analytics| PG
    NL2SQL <--> REDIS
    API_GW -->|Trigger Escalation / Webhook| N8N
```

---

## 3. Folder & File Structure

```
ai-support-chatbot/
│
├── .agents/skills/project-overview/SKILL.md # Architecture map skill
├── backend/                                # Python FastAPI backend
│   ├── app/
│   │   ├── models/                         # Pydantic schemas
│   │   │   ├── analytics.py                # NLQueryRequest, NLQueryResult
│   │   │   ├── chat.py                     # ChatRequest, HistoryMessage
│   │   │   └── document.py                 # IngestFAQRequest, IngestURLRequest
│   │   ├── routers/                        # FastAPI HTTP Routers
│   │   │   ├── analytics.py                # POST /analytics/nl-query
│   │   │   ├── chat.py                     # POST /chat/message (SSE), POST /chat/telegram
│   │   │   ├── embeddings.py               # GET /embeddings/status
│   │   │   ├── health.py                   # GET /health
│   │   │   ├── ingest.py                   # POST /ingest/document, /faq, /url, DELETE /document
│   │   │   └── telegram.py                 # POST /telegram/start, /stop, /webhook
│   │   ├── services/                       # Business logic & AI pipelines
│   │   │   ├── ai_engine.py                # Groq SDK streaming with multi-tier fallback
│   │   │   ├── chroma_service.py           # ChromaDB client & vector CRUD operations
│   │   │   ├── claude_service.py           # Anthropic Claude fallback integration
│   │   │   ├── document_processor.py       # PDF & DOCX text extraction and chunking
│   │   │   ├── embedding_service.py        # FastEmbed ONNX model loader & batched encoder
│   │   │   ├── js_scraper.py               # Playwright headless browser web scraper
│   │   │   ├── language_service.py         # Multi-language detection & translation
│   │   │   ├── llm_service.py              # LLM prompt builder & stream formatter
│   │   │   ├── nl2sql_service.py           # Natural Language to SQL converter with Redis cache
│   │   │   ├── rag_service.py              # Retrieval coordination & prompt assembly
│   │   │   ├── telegram_bot.py             # Telegram python-telegram-bot instance manager
│   │   │   └── url_scraper.py              # Recursive web crawler with BeautifulSoup
│   │   ├── utils/text_splitter.py          # Recursive character chunking engine
│   │   ├── config.py                       # Pydantic BaseSettings config parser
│   │   └── database.py                     # SQLAlchemy async engine & session maker
│   ├── tests/                              # Pytest test suite (test_chat, test_ingest, test_rag)
│   ├── main.py                             # FastAPI server entrypoint & lifespan manager
│   ├── requirements.txt                    # Python dependencies
│   └── Dockerfile                          # Backend container image definition
│
├── frontend/                               # Next.js 14 Full-Stack Frontend
│   ├── prisma/schema.prisma                # PostgreSQL Prisma schema & enums
│   ├── public/                             # Public static assets & branding
│   ├── src/
│   │   ├── app/                            # App Router routes & API endpoints
│   │   │   ├── (auth)/                     # /login, /register authentication pages
│   │   │   ├── (dashboard)/                # Protected dashboard layout & views
│   │   │   │   ├── chatbot/                # Bot creation, settings, docs, preview
│   │   │   │   ├── analytics/              # NL2SQL & platform metrics page
│   │   │   │   ├── tickets/                # Feedback & escalation ticket management
│   │   │   │   └── settings/               # Workspace, API keys, and billing settings
│   │   │   ├── api/                        # Serverless API routes & backend proxies
│   │   │   │   ├── chat/route.ts           # /api/chat: SSE proxy, PII masking & sentiment trigger
│   │   │   │   ├── chatbot/route.ts        # /api/chatbot: CRUD operations on chatbots
│   │   │   │   ├── knowledge/              # /api/knowledge/upload, /url, /faq handlers
│   │   │   │   ├── payments/               # /api/payments/create-order, /verify (Razorpay)
│   │   │   │   └── webhooks/               # Inbound hooks from n8n & Telegram
│   │   │   └── chat/[botId]/page.tsx       # Standalone customer-facing chat room
│   │   ├── components/                     # Modular React UI components
│   │   ├── hooks/useChat.ts, useSpeech.ts  # Streaming and Web Speech hooks
│   │   ├── lib/                            # auth.ts, prisma.ts, privacy.ts, sentiment.ts
│   │   └── middleware.ts                   # Route protection guard & session cookie checker
│   ├── package.json                        # Node dependencies & npm scripts
│   └── Dockerfile                          # Frontend production container image
│
├── embed/src/widget.js                     # Standalone embeddable JavaScript widget bundle
├── docs/                                   # Architectural & operational documentation
├── n8n-workflows/                          # Pre-configured n8n workflow JSON exports
├── docker-compose.yml                      # Production Docker Compose orchestration
├── docker-compose.dev.yml                  # Local development Docker Compose
└── Makefile                                # Command-line developer shortcuts
```

---

## 4. Frontend Analysis

### ⚛️ Framework & Build System
- **Framework**: Next.js 14.2.14 (App Router)
- **Runtime**: Node.js 18+ / 20+
- **Language**: TypeScript 5.6.2
- **Build System**: Next.js Webpack compiler with PostCSS and Tailwind CSS
- **Package Manager**: npm

### 🖥️ Major UI Components
- **`ChatWidget.tsx` / `ChatPreview.tsx`**: Renders the conversation interface, handles streaming token assembly, Markdown rendering, auto-scrolling, and speech synthesis controls.
- **`FeedbackModal.tsx`**: Modal attached to chat sessions allowing visitors to submit tickets (categories: `INACCURATE_ANSWER`, `BUG_REPORT`, `COMPLAINT`, `FEATURE_REQUEST`).
- **`BotStudio.tsx`**: Configuration interface for bot branding (primary color, welcome message, system prompt, temperature, privacy level).
- **`KnowledgeManager.tsx`**: Drag-and-drop file uploader (PDF/DOCX), URL crawler configurator, and chunk status viewer.
- **`NL2SQLQueryBar.tsx` & `AnalyticsCharts.tsx`**: Conversational SQL query runner and Recharts-based sentiment & volume metrics.

### 📄 Pages & Routes
| Route | Type | Purpose & Data Displayed |
| :--- | :--- | :--- |
| `/login` & `/register` | Public | NextAuth sign-in form with Google OAuth and Email magic-link buttons. |
| `/dashboard` | Protected | High-level metrics (total bots, total sessions, message volume, avg sentiment). |
| `/dashboard/chatbot/[id]` | Protected | Bot configuration studio, system prompt editing, and Telegram token binding. |
| `/dashboard/chatbot/[id]/knowledge` | Protected | Upload documents, trigger URL crawls, and inspect chunk indexing states. |
| `/dashboard/chatbot/[id]/preview` | Protected | Sandbox chat simulator with voice testing and language dropdown. |
| `/dashboard/analytics` | Protected | NL2SQL interactive bar and analytics charts for conversations and sentiments. |
| `/dashboard/tickets` | Protected | Feedback ticket resolution desk with admin response and client override options. |
| `/dashboard/settings` | Protected | Workspace billing tier (Razorpay integration), API keys, and admin controls. |
| `/chat/[botId]` | Public | Standalone public chat preview branded with the bot's custom theme. |

---

## 5. Backend Analysis

### 🐍 Framework & Entry Point
- **Framework**: FastAPI (Python 3.11+)
- **Server Entry**: [`backend/main.py`](file:///d:/ai-support-chatbot/backend/main.py)
- **ASGI Server**: Uvicorn (`uvicorn app.main:app --host 0.0.0.0 --port 8000`)
- **Lifespan Manager**: Startup tasks check database connectivity, initialize ChromaDB, pre-warm the FastEmbed model in a background thread, and auto-restart all active Telegram bot polling routines.

### ⚙️ Backend Request Lifecycle
```
Inbound HTTP Request
         ↓
CORSMiddleware (Validates Origin against settings.ALLOWED_ORIGINS)
         ↓
FastAPI Router matching (/chat, /ingest, /analytics, etc.)
         ↓
Pydantic Request Body Validation (ChatRequest, IngestURLRequest, etc.)
         ↓
Service Execution (RAGService, ChromaService, NL2SQLService, etc.)
         ↓
Database Operation (AsyncSessionLocal SQLAlchemy) / ChromaDB Query / Groq Call
         ↓
Response Serializer (StreamingResponse SSE or JSONResponse)
```

---

## 6. API Documentation

| Method | Endpoint | Purpose | Auth Required | Request Body / Params | Response Schema |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/chat/message` | RAG Chat Streaming | No (Public/BotId) | `{ chatbot_id, session_id, message, history, language, system_prompt }` | `text/event-stream` (SSE tokens) |
| `POST` | `/chat/telegram` | Telegram Non-streaming Chat | Internal/BotId | `{ chatbot_id, session_id, message, history, language }` | `{"reply": string, "chatbot_id": string}` |
| `POST` | `/ingest/document`| Ingest PDF/DOCX file | Workspace User | `multipart/form-data (chatbot_id, document_id, file)` | `{"status": "processing", "document_id": string}` |
| `POST` | `/ingest/faq` | Ingest structured Q&A pairs | Workspace User | `{ chatbot_id, document_id, pairs: [{question, answer}] }` | `{"status": "processing", "document_id": string}` |
| `POST` | `/ingest/url` | Ingest & crawl website | Workspace User | `{ chatbot_id, document_id, url, max_pages }` | `{"status": "processing", "document_id": string}` |
| `DELETE`| `/ingest/document/{cb_id}/{doc_id}` | Delete document vectors | Workspace User | None (Path parameters) | `{"status": "deleted"}` |
| `POST` | `/analytics/nl-query` | Convert Natural Language to SQL | Workspace User | `{ question: string, user_id: string }` | `{"sql": string, "columns": [], "rows": [], "rowCount": int}` |
| `GET` | `/health` | Check backend & DB status | No | None | `{"status": "healthy", "database": true, "chroma": true}` |
| `POST` | `/telegram/start` | Start Telegram Bot polling | Admin/Workspace | `{ chatbot_id, token, business_name, language, system_prompt }` | `{"status": "started"}` |
| `POST` | `/telegram/stop` | Stop Telegram Bot polling | Admin/Workspace | `{ chatbot_id }` | `{"status": "stopped"}` |

---

## 7. Database Analysis

### 🗄️ Relational Database (PostgreSQL)
Managed through Prisma ORM on frontend and SQLAlchemy on backend.

```
User (id, email, plan, role)
 ├── Accounts[] (OAuth tokens)
 ├── Sessions[] (Active login sessions)
 ├── Payments[] (Razorpay transactions: amount, status, orderId)
 └── Chatbots[] (id, name, systemPrompt, primaryColor, privacyLevel, telegramToken)
      ├── Documents[] (id, name, type, status, chunkCount)
      ├── FeedbackTickets[] (id, visitorId, category, status, description, adminResponse)
      └── ChatSessions[] (id, visitorId, language, sentiment, sentimentScore, needsFollowUp)
           └── Messages[] (id, role: USER|ASSISTANT, content, tokens, confidence)
```

---

## 8. Authentication & Authorization

### 🔐 Auth Strategy
- **Library**: NextAuth.js v4 with `@next-auth/prisma-adapter`.
- **Strategy**: JWT (`session: { strategy: "jwt" }`) with session cookies.
- **Providers**: Google OAuth & Email Magic Links.
- **RBAC Roles**:
  - `WORKSPACE`: Standard user. Can only manage their own chatbots, documents, and view their own analytics.
  - `ADMIN`: Platform super-user (configured via `ADMIN_EMAILS`). Has global access to all tenant tickets, elevated enterprise plan features, and system oversight.
- **Route Guard**: [`frontend/src/middleware.ts`](file:///d:/ai-support-chatbot/frontend/src/middleware.ts) redirects unauthenticated users to `/login`.

---

## 9. Multi-Tenancy

- **Tenant Isolation**: Each user is a workspace tenant owning multiple chatbots.
- **Relational Data Isolation**: All queries enforce `WHERE "userId" = session.user.id`.
- **Vector Isolation**: ChromaDB collections are partitioned per chatbot as `bot_{chatbot_id}`.
- **NL2SQL Security Isolation**: Sanitizes user IDs and appends `WHERE "userId" = '...'` to generated SQL queries.

---

## 10. AI / ML Architecture

```
User Query (e.g. "What is your refund policy?")
                     │
                     ▼
      [ Language Translation Layer ]
   (Translates non-English to English for retrieval)
                     │
                     ▼
       [ FastEmbed Embedding Engine ]
   (all-MiniLM-L6-v2 via ONNX Runtime → 384-dim vector)
                     │
                     ▼
       [ ChromaDB Vector Search ]
   (Collection: bot_<id>, Cosine Metric, Top 8 Chunks)
                     │
                     ▼
     [ Similarity Filter Threshold ]
   (Discards chunks with cosine similarity < 0.25)
                     │
                     ▼
        [ Prompt & Guardrail Assembly ]
   (Strict zero-hallucination rules + context + history)
                     │
                     ▼
         [ Groq LPU Inference Engine ]
   (llama-3.3-70b-versatile, temp=0.2, streaming SSE)
                     │
                     ▼
     [ Asynchronous Sentiment Classifier ]
   (Categorizes session: POSITIVE | NEUTRAL | NEGATIVE)
```

---

## 11. Document Processing

```
1. File Upload / URL Submission
       ↓
2. Type Validation (PDF, DOCX, FAQ, Web URL)
       ↓
3. Text Extraction:
   - PDF: pypdf.PdfReader
   - DOCX: python-docx Document parser
   - URL (Static): BeautifulSoup4 HTML stripper
   - URL (Dynamic SPA): Playwright headless Chromium
       ↓
4. Recursive Text Chunking:
   - Target chunk size: ~500–1000 characters
   - Chunk overlap: 100 characters (preserves boundary context)
       ↓
5. Batched Embedding:
   - fastembed TextEmbedding(model="all-MiniLM-L6-v2", batch_size=64)
       ↓
6. Vector Upsert:
   - ChromaDB Collection.upsert(ids, embeddings, documents, metadatas)
       ↓
7. PostgreSQL Status Update:
   - UPDATE "Document" SET status = 'DONE', "chunkCount" = N
```

---

## 12. External Services & APIs

| Service | Purpose | Configuration / Env | Behavior on Failure |
| :--- | :--- | :--- | :--- |
| **Groq Cloud API** | Fast streaming LLM inference & NL2SQL | `GROQ_API_KEY`, `GROQ_MODEL` | Fails over to fallback model tier (`gpt-oss-20b` / `qwen3.6-27b`), then returns friendly user error. |
| **Anthropic Claude API** | Secondary fallback LLM service | `ANTHROPIC_API_KEY` | Available for manual or secondary fallback if configured. |
| **Telegram Bot API** | Direct Telegram chat integration | `telegramToken` per Chatbot | Retries polling, logs errors, auto-restarts on container boot. |
| **Razorpay** | Subscription payments | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Payments stay in `PENDING`, UI notifies user of failed checkout. |
| **n8n Webhook** | Escalation & automated notifications | `N8N_WEBHOOK_URL` | Non-blocking background log error; chat flow remains uninterrupted. |
| **Google OAuth** | User authentication | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Fallback to Email Magic Link login. |

---

## 13. Environment Variables

| Variable | Purpose | Used By | Required? | Example Format |
| :--- | :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | Frontend & Backend | **Yes** | `postgresql://user:pass@localhost:5432/db` |
| `DIRECT_URL` | Direct unpooled DB connection | Frontend Prisma | **Yes** | `postgresql://user:pass@localhost:5432/db` |
| `NEXTAUTH_SECRET` | Secret for signing JWT session tokens | Frontend | **Yes** | `32+ character random string` |
| `NEXTAUTH_URL` | Canonical URL of the application | Frontend | **Yes** | `http://localhost:3000` |
| `GROQ_API_KEY` | API Key for Groq LPU inference | Backend & Frontend | **Yes** | `gsk_...` |
| `GROQ_MODEL` | Primary LLM model identifier | Backend & Frontend | No (default set) | `openai/gpt-oss-120b` |
| `REDIS_URL` | Redis connection URL for caching | Backend | No | `redis://localhost:6379` |
| `CHROMA_HOST` | Remote ChromaDB host | Backend | No (default disk) | `chromadb` or `localhost` |
| `CHROMA_PORT` | Remote ChromaDB port | Backend | No | `8001` |
| `RAZORPAY_KEY_ID` | Razorpay public key | Frontend | For billing | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET`| Razorpay secret key | Frontend | For billing | `rzp_secret_...` |
| `N8N_WEBHOOK_URL` | Escalation webhook destination | Frontend & Backend | No | `http://localhost:5678/webhook/...` |

---

## 14. Docker & Deployment

```
docker-compose up -d --build
       │
       ├── chatbot_postgres (postgres:15-alpine)    → Port 5432
       ├── chatbot_redis    (redis:7-alpine)        → Port 6379
       ├── chatbot_chromadb (chromadb/chroma:0.5.11)→ Port 8001 (mapped from 8000)
       ├── chatbot_n8n      (n8nio/n8n:latest)      → Port 5678
       ├── chatbot_backend  (FastAPI Python 3.11)   → Port 8000
       └── chatbot_frontend (Next.js 14 Production) → Port 3000
```

---

## 15. Complete User Journey

### User Asks AI Question in Chat Widget
```
Visitor types query in ChatWidget → POST `/api/chat`
  ↓
Next.js loads chatbot record & checks privacy level
  ↓
Next.js masks PII (if PII_MASKED) and forwards to FastAPI `/chat/message`
  ↓
FastAPI `RagService`:
  - Translates query to English if non-English
  - Computes query embedding via FastEmbed ONNX
  - Queries ChromaDB for top 8 relevant chunks ($min\_similarity \ge 0.25$)
  - Injects chunks into zero-hallucination prompt
  - Invokes Groq LPU streaming API
  ↓
FastAPI yields Server-Sent Events (SSE) back to Next.js
  ↓
Next.js streams tokens to browser and records conversation to PostgreSQL
  ↓
Next.js asynchronously invokes `scoreSessionSentiment()` via Groq
```

---

## 16. Code-Level Dependency Analysis

- **`AIEngine.stream()`** ([`backend/app/services/ai_engine.py`](file:///d:/ai-support-chatbot/backend/app/services/ai_engine.py)): Trims context to 12,000 characters, builds OpenAI-compatible messages payload, streams tokens with automatic retry and model fallback.
- **`ChromaService.query()`** ([`backend/app/services/chroma_service.py`](file:///d:/ai-support-chatbot/backend/app/services/chroma_service.py)): Queries collection `bot_{chatbot_id}`, computes similarity ($1.0 - distance$), filters out low-confidence matches.
- **`NL2SQLService.query()`** ([`backend/app/services/nl2sql_service.py`](file:///d:/ai-support-chatbot/backend/app/services/nl2sql_service.py)): Checks Redis cache; generates SQL with Groq; validates `SELECT` only; sanitizes user ID literals; executes query against PostgreSQL; caches result for 300s.

---

## 17. Error Handling

- **AI Inference Rate Limits (HTTP 429)**: `AIEngine` catches `RateLimitError`, waits 1s, and automatically cascades through secondary fallback models (`gpt-oss-20b`, `qwen3.6-27b`).
- **FastAPI Downtime**: If FastAPI is offline or restarting, [`frontend/src/app/api/chat/route.ts`](file:///d:/ai-support-chatbot/frontend/src/app/api/chat/route.ts) catches the fetch failure and automatically routes to a direct Next.js Edge AI fallback engine.
- **Transient DB Deadlocks**: Ingestion status updates in [`backend/app/routers/ingest.py`](file:///d:/ai-support-chatbot/backend/app/routers/ingest.py) use an exponential retry loop (3 attempts with 1.0s backoff).
- **Web Scraping Timeouts**: `_scrape_and_embed()` enforces a 300s timeout on comprehensive crawls, falling back to a 10-page partial crawl before failing gracefully.

---

## 18. Security Analysis

- ✅ **SQL Injection Prevention**: Parameterized queries via Prisma and SQLAlchemy; NL2SQL rejects non-`SELECT` statements.
- ✅ **PII Redaction**: Real-time regex engine masks credit cards, SSNs, emails, API keys, and passwords before database write.
- ✅ **Zero-Retention Mode**: Ephemeral client-only memory mode for strict compliance environments.
- ✅ **Origin Filtering**: Restricts CORS headers to authorized domain origins.

---

## 19. Performance Analysis

1. **Groq LPU Hardware**: Generates ~500 tokens/sec, reducing Time-To-First-Token (TTFT) to < 200ms.
2. **FastEmbed ONNX**: Uses ~80MB RAM per worker instead of ~800MB (PyTorch), preventing container OOM errors.
3. **Redis NL2SQL Caching**: Caches analytical SQL results using a SHA-256 hash of the question and user ID.
4. **FastAPI Connection Pooling**: Configured with `pool_size=3`, `max_overflow=5`, and `pool_recycle=1800`.

---

## 20. Testing

### Existing Tests:
- [`backend/tests/test_chat.py`](file:///d:/ai-support-chatbot/backend/tests/test_chat.py): Verifies `/chat/message` endpoint schema and error handling.
- [`backend/tests/test_ingest.py`](file:///d:/ai-support-chatbot/backend/tests/test_ingest.py): Validates FAQ and document ingestion background task dispatch.
- [`backend/tests/test_rag.py`](file:///d:/ai-support-chatbot/backend/tests/test_rag.py): Tests ChromaDB similarity search, threshold filtering, and context extraction.

---

## 21. Project Strengths & Weaknesses

### 🌟 Strengths:
- **Blazing Fast**: Sub-second end-to-end streaming latency.
- **Enterprise-Ready Privacy**: Granular PII masking and Zero-Retention capabilities.
- **Multi-Modal Scrapers**: Can ingest static documents as well as dynamic client-side JS websites via Playwright.
- **Omnichannel Support**: Single backend supports Web, Telegram, and Voice seamlessly.

### ⚠️ Potential Weaknesses:
- **ChromaDB Local Disk Persistence**: Multi-replica horizontal scaling requires a centralized ChromaDB cluster or pgvector.
- **Background Tasks**: Heavy web crawls run inside FastAPI `BackgroundTasks`; high volume would benefit from a dedicated worker queue (e.g. Celery / BullMQ).

---

## 22. Interview Preparation

### ⏱️ 30-Second Elevator Pitch
> *"I built a multi-tenant AI Customer Support SaaS platform that lets businesses train custom AI agents on their documents and websites in under a minute. The system uses Next.js 14 and FastAPI with ChromaDB and Groq's LPU hardware to deliver sub-second streaming answers with zero hallucinations. It also includes automated sentiment tracking, human support escalation via n8n, and plain-English NL2SQL analytics."*

### ⏱️ 1-Minute Technical Overview
> *"My project is a full-stack AI SaaS built with Next.js 14 App Router, Python FastAPI, PostgreSQL, and ChromaDB. Businesses can upload PDFs, Word docs, or website URLs, which our backend chunks, embeds using FastEmbed with ONNX runtime, and indexes into isolated ChromaDB vector collections. When a customer asks a question—via web widget or Telegram—the query is embedded, relevant chunks are retrieved, and an answer is streamed at ~500 tokens/second using Groq's Llama-3.3-70B model. The platform features enterprise PII redaction, automated session sentiment analysis, n8n webhook escalations for dissatisfied customers, and natural language SQL reporting."*

### ⏱️ 3-Minute Deep Dive
> *"For this project, I architected an enterprise customer concierge platform addressing the high latency, hallucination risks, and privacy concerns of traditional customer support bots. On the frontend, Next.js 14 provides an admin dashboard for chatbot customization, knowledge ingestion, and ticket management, secured with NextAuth and Prisma. For the backend, I chose FastAPI to build an asynchronous AI processing engine.
> 
> When documents or websites are submitted, our ingestion service uses PyPDF, python-docx, and Playwright for dynamic SPAs, splitting text into overlapping chunks. We use FastEmbed running on ONNX Runtime to compute embeddings efficiently on CPU with a 90% memory reduction compared to PyTorch.
> 
> During inference, the RAG engine performs cosine similarity search in ChromaDB, applies a 0.25 similarity filter to discard irrelevant noise, and injects the context into a strictly grounded system prompt. We stream tokens from Groq's LPU inference hardware running Llama-3.3-70B, falling back to smaller models if rate limits are hit.
> 
> For enterprise security, we built a real-time PII redaction engine that masks emails, credit cards, and API keys before database persistence, along with a Zero-Retention mode. Post-conversation, an asynchronous sentiment classifier scores the interaction, triggering n8n webhook alerts to human agents if customer sentiment drops. Finally, workspace admins can query their analytics using plain English through an NL2SQL pipeline with Redis caching."*

---

## 23. Technical Interview Questions & Answers

### 🟢 Beginner Questions & Answers
1. **Q: Why is Next.js 14 App Router used for the frontend?**  
   *A: It provides built-in SSR, API route handlers, Server Actions, and native support for streaming responses, simplifying full-stack development with TypeScript.*
2. **Q: What is the purpose of ChromaDB in this project?**  
   *A: ChromaDB is a vector database used to store document embeddings and perform fast cosine similarity searches to retrieve context relevant to user questions.*
3. **Q: How does the chatbot avoid hallucinating answers?**  
   *A: We use strict prompt engineering instructing the LLM to only answer from retrieved context and return 'I do not have this detail' if the fact is absent, coupled with a minimum cosine similarity threshold of 0.25.*
4. **Q: What is Server-Sent Events (SSE)?**  
   *A: SSE is a unidirectional HTTP streaming protocol that allows the backend to push real-time text chunks to the browser over a single persistent connection.*
5. **Q: How is authentication managed?**  
   *A: Using NextAuth.js with JWT session strategy, supporting Google OAuth and Email magic links stored in PostgreSQL via Prisma Adapter.*

### 🟡 Intermediate Questions & Answers
1. **Q: Why use FastEmbed instead of sentence-transformers with PyTorch?**  
   *A: FastEmbed utilizes ONNX Runtime, reducing memory consumption from ~800MB to ~80MB, preventing container out-of-memory (OOM) crashes on constrained servers like Railway.*
2. **Q: How does multi-tenancy work in ChromaDB?**  
   *A: Each chatbot has its own isolated collection named `bot_{chatbot_id}`, ensuring that vector queries are restricted to the specific chatbot's documents.*
3. **Q: How does the NL2SQL service prevent SQL injection?**  
   *A: It forces a `SELECT`-only rule, removes markdown and harmful DDL/DML, escapes single quotes on user IDs, and executes queries through SQLAlchemy parameterized bindings.*
4. **Q: What happens if Groq hits an API rate limit?**  
   *A: `AIEngine` catches `RateLimitError`, waits 1s, and cascades through a fallback list of models (`openai/gpt-oss-120b` → `openai/gpt-oss-20b` → `qwen/qwen3.6-27b`).*
5. **Q: How does the web embed widget work on external websites?**  
   *A: A single `<script>` tag is embedded on the host site. It injects a floating button and iframe/shadow DOM communicating with `/api/chat` via postMessage/fetch.*

### 🔴 Advanced Questions & Answers
1. **Q: Explain the lifecycle of the PII masking and Zero-Retention engine.**  
   *A: Before database persistence, messages pass through regex sanitizers in `privacy.ts` masking cards, emails, and tokens. In `ZERO_RETENTION` mode, database writes are bypassed entirely, and chat history is maintained ephemerally on the client.*
2. **Q: How does the backend support dynamic JavaScript-rendered single-page applications?**  
   *A: `JSScraper` uses Playwright to launch a headless Chromium browser, wait for network idle events, execute JavaScript, and extract the rendered DOM text.*
3. **Q: How are non-English queries handled in the RAG pipeline?**  
   *A: If a non-English language code is passed, `LanguageService` translates the query to English for optimal embedding similarity search against English documents, while the LLM is instructed to generate the final response in the user's native language.*
4. **Q: How does Redis optimize the NL2SQL feature?**  
   *A: Repeated natural language queries generate a SHA-256 key (`nl2sql:<hash>`) cached in Redis for 300 seconds, bypassing both the Groq translation call and database query execution.*
5. **Q: How does the Telegram bot stay synchronized with database changes?**  
   *A: On FastAPI startup, the lifespan hook queries all active chatbots with non-null `telegramToken` and initializes async polling instances via `python-telegram-bot`.*

---

## 24. "Why Did You Use This?" Technology Justifications

| Technology | Chosen Over | Architectural Justification |
| :--- | :--- | :--- |
| **Next.js 14 App Router** | Vite / CRA + Express | Built-in API route handlers, server components, automated SSR, and unified TypeScript ecosystem. |
| **FastAPI** | Flask / Django | Asynchronous native ASGI support, automatic Pydantic validation, and high performance for concurrent AI streaming. |
| **Groq LPU** | OpenAI GPT-4o / Anthropic | 500+ tokens/sec throughput, minimal Time-To-First-Token, and lower inference costs for real-time customer support. |
| **ChromaDB** | Pinecone / Weaviate | Open-source, zero external SaaS dependency, runs locally or persistent on disk with per-tenant collections. |
| **FastEmbed (ONNX)** | HuggingFace PyTorch | 90% lower memory footprint (~80MB RAM vs ~800MB), fast CPU inference, eliminates container crashes. |
| **Prisma ORM** | TypeORM / Drizzle | Declarative schema, auto-generated TypeScript client, safe database migrations, and seamless NextAuth integration. |
| **Redis** | In-memory Python Dict | Distributed cache shared across multiple backend worker processes with built-in TTL expiration. |
| **n8n** | Zapier / Custom Cron | Self-hostable, low-code webhook orchestration for external email, Slack, and CRM ticket escalations. |

---

## 25. Important Things You MUST Memorize

### 🔴 MUST KNOW (Critical Fundamentals)
- The end-to-end RAG pipeline: Chunking $\rightarrow$ FastEmbed (ONNX) $\rightarrow$ ChromaDB (cosine similarity) $\rightarrow$ Groq LPU (Llama 3.3 70B) $\rightarrow$ SSE Stream.
- Zero-hallucination guardrails ($min\_similarity = 0.25$, strict system prompt).
- Tech stack: Next.js 14, FastAPI, PostgreSQL (Prisma), ChromaDB, Redis, Groq.
- The role of `frontend/src/app/api/chat/route.ts` as the streaming gateway and PII sanitizer.

### 🟡 SHOULD KNOW (System Nuances)
- The fallback mechanism in `AIEngine` for handling Groq 429 rate-limit errors.
- The three enterprise privacy levels: `STANDARD`, `PII_MASKED`, `ZERO_RETENTION`.
- How NL2SQL safely queries PostgreSQL with user isolation and Redis caching.
- Telegram auto-start lifecycle in `backend/main.py`.

### 🟢 GOOD TO KNOW (Edge Cases & Dev Ops)
- How FastEmbed reduces memory from 800MB to 80MB using ONNX Runtime.
- Playwright integration in `js_scraper.py` for client-side rendered websites.
- Docker Compose service dependencies and health checks.

---

## 26. Final Project Cheat Sheet

```text
PROJECT:             AI Customer Support Chatbot SaaS Platform
PURPOSE:             Instant document/URL trained AI assistants with sub-second streaming answers
TARGET USERS:        E-commerce stores, SaaS companies, and customer support organizations
FRONTEND:            Next.js 14 (App Router), TypeScript, Tailwind CSS, Radix UI, Framer Motion
BACKEND:             Python 3.11+ FastAPI, Uvicorn, Pydantic v2, SQLAlchemy
DATABASE:            PostgreSQL 15 (Prisma ORM on frontend, asyncpg on backend)
AUTHENTICATION:      NextAuth.js v4 (Google OAuth & Email Magic Links, JWT session strategy)
AI / LLM:            Groq LPU (llama-3.3-70b-versatile / gpt-oss-120b), Claude fallback tier
VECTOR DATABASE:     ChromaDB 0.5.11 (HNSW Cosine Metric, per-chatbot collections bot_<id>)
EMBEDDING MODEL:     fastembed (sentence-transformers/all-MiniLM-L6-v2 via ONNX Runtime)
STORAGE:             Local Persistent Volumes (/data/chroma) & PostgreSQL
EXTERNAL APIs:       Groq API, Telegram Bot API, Razorpay Node SDK, n8n Webhook
DEPLOYMENT:          Docker Compose, Dockerfiles, Railway / Vercel configurations
MAIN FEATURES:       RAG Streaming Chat, Web Embed Widget, Telegram Bot, Voice I/O, PII Redactor,
                     Zero-Retention Mode, NL2SQL Analytics, Sentiment Classifier, n8n Escalation
KEY API ENDPOINTS:   POST /api/chat, POST /chat/message, POST /ingest/document, POST /analytics/nl-query
KEY DB TABLES:       User, Chatbot, Document, ChatSession, Message, FeedbackTicket, Payment
MAIN AI PIPELINE:    Query -> Translate -> FastEmbed -> ChromaDB (k=8) -> Filter -> Groq LPU -> SSE
BIGGEST CHALLENGE:   Preventing container OOM crashes and eliminating LLM hallucinations
HOW IT WAS SOLVED:   Replaced PyTorch with FastEmbed ONNX (~80MB RAM) & added strict 0.25 similarity filter
SECURITY:            Regex PII masking, Zero-Retention mode, parameterized SQL, NextAuth RBAC
SCALABILITY:         Stateless FastAPI streaming, Redis query caching, sub-second LPU hardware
```
