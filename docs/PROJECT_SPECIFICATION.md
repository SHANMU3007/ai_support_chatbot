# 🤖 AI Customer Support Chatbot SaaS — Master Project Specification

> **Version**: 1.0.0  
> **Last Updated**: 2026-08-25  
> **Architecture Pattern**: Decoupled Monorepo (Next.js 14 App Router + Python FastAPI RAG Engine + PostgreSQL + ChromaDB)

---

## 📋 Table of Contents
1. [Executive Summary & Core Value Proposition](#1-executive-summary--core-value-proposition)
2. [High-Level System Architecture & Flow](#2-high-level-system-architecture--flow)
3. [Complete Technology Stack](#3-complete-technology-stack)
4. [Repository & Codebase Structure](#4-repository--codebase-structure)
5. [Frontend Architecture (Next.js 14)](#5-frontend-architecture-nextjs-14)
6. [Backend Architecture & Services (FastAPI)](#6-backend-architecture--services-fastapi)
7. [RAG Ingestion & Query Pipeline](#7-rag-ingestion--query-pipeline)
8. [Database Schema & Data Models](#8-database-schema--data-models)
9. [Omnichannel Deployment (Web Widget & Telegram)](#9-omnichannel-deployment-web-widget--telegram)
10. [n8n Automation & Escalations](#10-n8n-automation--escalations)
11. [Complete API Reference](#11-complete-api-reference)
12. [Environment Variables & Deployment](#12-environment-variables--deployment)

---

## 1. Executive Summary & Core Value Proposition

The **AI Customer Support Chatbot SaaS** is a multi-tenant platform designed to allow businesses to create, train, and deploy customized conversational AI agents in under 60 seconds.

### Key Capabilities:
- **Instant Document & Web Knowledge Ingestion**: Upload PDFs, DOCX files, raw text, static URLs, or dynamic JavaScript single-page applications.
- **Ultra-Low Latency Inference**: Uses **Groq LPU hardware acceleration** running `llama-3.3-70b-versatile` to stream answers at ~500 tokens/sec.
- **Strict Grounding (RAG)**: Answers are strictly derived from vectorized company content via **ChromaDB**, preventing hallucinations.
- **Omnichannel Distribution**:
  - Standalone embeddable JS widget (`<script>` tag integration).
  - Direct integration with **Telegram Bot API**.
  - Interactive web preview and testing sandbox.
- **Automated Human Escalation & Sentiment Analysis**: Real-time message sentiment tracking with webhook handoff to **n8n automation** when human intervention is needed.
- **Plain-English NL2SQL Analytics**: Query conversation logs and chatbot performance metrics using natural language.
- **Enterprise Controls**: Multi-tier privacy settings (`STANDARD`, `PII_MASKED`, `ZERO_RETENTION`), Razorpay subscription billing, and ticket management.

---

## 2. High-Level System Architecture & Flow

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
        N8N[n8n Automation Engine]
    end

    W -->|Chat Interaction / Voice| API_GW
    T -->|Webhook Updates| ROUTER
    A -->|Manage Bots / View Stats| UI
    UI -->|API Requests| API_GW
    API_GW -->|HTTP / SSE Forwarding| ROUTER

    ROUTER --> LANG
    ROUTER --> RAG
    ROUTER --> NL2SQL
    ROUTER --> SCRAPERS

    RAG -->|Similarity Search| CHROMA
    CHROMA -->|Context Chunks| RAG
    RAG -->|Grounded Prompt| GROQ
    GROQ -.->|Rate Limit Fallback| CLAUDE
    GROQ -->|Server-Sent Events (SSE)| API_GW
    API_GW -->|Stream Tokens| W

    API_GW -->|Prisma ORM CRUD| PG
    ROUTER -->|SQL Logging & Analytics| PG
    API_GW -->|Trigger Escalation / Webhook| N8N
```

---

## 3. Complete Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, PostCSS, Framer Motion
- **Icons & UI**: Lucide React, Radix UI primitives, Custom glassmorphic components
- **Auth**: NextAuth.js (Credentials & OAuth providers)
- **Database Client**: Prisma ORM (Client v5+)
- **Payments**: Razorpay Node SDK & Client integration

### Backend
- **Framework**: Python 3.11+ FastAPI, Uvicorn ASGI Server
- **Validation**: Pydantic v2
- **Vector Retrieval**: ChromaDB
- **Embedding Generation**: `fastembed` / HuggingFace `all-MiniLM-L6-v2`
- **LLM Integrations**: Groq SDK (`groq-python`), Anthropic SDK (`anthropic`)
- **Web Scraping**: Playwright (Headless Chromium), BeautifulSoup4, Requests
- **Document Extractors**: `pypdf`, `python-docx`
- **Database Engine**: SQLAlchemy 2.0 + asyncpg / psycopg2 for PostgreSQL

### Automation & Tooling
- **Workflow Engine**: n8n
- **Containerization**: Docker, Docker Compose (`docker-compose.yml`, `docker-compose.dev.yml`)
- **Automation Scripts**: Makefile, Bash/PowerShell setup scripts

---

## 4. Repository & Codebase Structure

```
ai-support-chatbot/
├── .agents/skills/             # Custom Antigravity / AI agent skills
│   └── project-overview/       # Repository structure & architecture map
├── backend/                    # Python FastAPI service
│   ├── app/
│   │   ├── models/             # SQLAlchemy / Pydantic schemas
│   │   │   ├── analytics.py    # Analytics query models
│   │   │   ├── chat.py         # Chat request/response models
│   │   │   └── document.py     # Document ingestion status models
│   │   ├── routers/            # HTTP endpoints
│   │   │   ├── analytics.py    # NL2SQL & platform metrics
│   │   │   ├── chat.py         # RAG streaming chat endpoints
│   │   │   ├── embeddings.py   # Embedding check & status
│   │   │   ├── health.py       # Health check & system status
│   │   │   ├── ingest.py       # Document, URL & text ingestion routes
│   │   │   └── telegram.py     # Telegram webhook handler
│   │   ├── services/           # Core AI & business logic
│   │   │   ├── ai_engine.py    # Model orchestration & Groq fallback
│   │   │   ├── chroma_service.py # Vector store indexing & queries
│   │   │   ├── claude_service.py # Anthropic Claude API integration
│   │   │   ├── document_processor.py # File parser (PDF/DOCX/TXT)
│   │   │   ├── embedding_service.py  # Vector embeddings generator
│   │   │   ├── js_scraper.py   # Playwright JS page scraper
│   │   │   ├── language_service.py   # Language detection & translation
│   │   │   ├── llm_service.py  # Prompt builder & stream formatter
│   │   │   ├── nl2sql_service.py     # Natural Language to SQL converter
│   │   │   ├── rag_service.py  # RAG retrieval context assembler
│   │   │   ├── telegram_bot.py # Telegram bot message dispatcher
│   │   │   └── url_scraper.py  # Static web crawler & chunker
│   │   ├── config.py           # Settings & environment parser
│   │   ├── database.py         # Database connection pool
│   │   └── main.py             # FastAPI application entrypoint
│   ├── requirements.txt        # Backend dependencies
│   └── tests/                  # Backend pytest suites
│
├── frontend/                   # Next.js 14 App Router application
│   ├── prisma/
│   │   └── schema.prisma       # Database schema & migrations definition
│   ├── public/                 # Static assets, fonts, icons
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/         # Login, Register, Forgot Password
│   │   │   ├── (dashboard)/    # Workspace admin management
│   │   │   │   ├── chatbot/    # Bot config, preview, documents, analytics
│   │   │   │   ├── settings/   # Profile, API keys, billing
│   │   │   │   └── tickets/    # Human escalation & feedback tickets
│   │   │   ├── api/            # Serverless API routes & backend proxies
│   │   │   │   ├── analytics/  # Dashboard metrics
│   │   │   │   ├── chatbot/    # Chatbot CRUD operations
│   │   │   │   ├── embed/      # Script embed serving
│   │   │   │   ├── knowledge/  # File upload & document sync
│   │   │   │   ├── payments/   # Razorpay order & verification routes
│   │   │   │   └── webhooks/   # n8n & Telegram inbound hooks
│   │   │   └── chat/[botId]/   # Standalone web chat interface
│   │   ├── components/         # Reusable React UI components
│   │   │   ├── chatbot/        # Chat preview, config, feedback modals
│   │   │   ├── dashboard/      # Metrics charts, sidebars, headers
│   │   │   └── ui/             # Buttons, badges, modals, toast alerts
│   │   ├── hooks/              # Custom React hooks (chat, speech, stream)
│   │   └── lib/                # Utilities, auth options, prisma client
│   └── package.json
│
├── embed/                      # Standalone bundleable JavaScript widget
├── docs/                       # Architectural & reference documentation
├── n8n-workflows/              # Exported JSON automation workflows
├── docker-compose.yml          # Production multi-container composition
├── docker-compose.dev.yml      # Local development container configuration
└── Makefile                    # Developer command shortcuts
```

---

## 5. Frontend Architecture (Next.js 14)

### 1. App Router Structure
- **`(auth)` Route Group**: Handles unauthenticated guest flows with NextAuth.js integration.
- **`(dashboard)` Route Group**: Protected workspace layout providing:
  - **Bot Studio**: Configure bot name, avatar, primary brand color, system prompt, temperature, and welcome message.
  - **Knowledge Base Manager**: Drag-and-drop file uploader, URL crawler trigger, and chunk status viewer.
  - **Chat Sandbox / Preview**: Real-time test simulator with voice recognition and regional language switching.
  - **Analytics & NL2SQL**: Sentiment breakdown charts, latency stats, and natural-language query interface.
  - **Ticket Center**: Customer complaint management, manual override responses, and admin escalation.
- **`chat/[botId]`**: Clean, brand-tailored public chat room for direct customer access without embedding.

### 2. State & Streaming
- **SSE Stream Reader**: Custom hooks consume Server-Sent Events (`text/event-stream`) from the API proxy to render real-time typewriter responses.
- **Sentiment & Feedback Modal**: Interactive rating component allowing users to submit feedback and trigger tickets directly from active conversations.

---

## 6. Backend Architecture & Services (FastAPI)

### Service Responsibilities:

| Service | File | Description |
| :--- | :--- | :--- |
| **AIEngine** | `ai_engine.py` | Routes LLM requests to Groq (`llama-3.3-70b-versatile`); automatically fails over to secondary models if rate-limited. |
| **RAGService** | `rag_service.py` | Coordinates document vector lookup, similarity scoring, context chunk assembly, and prompt construction. |
| **ChromaService** | `chroma_service.py` | Manages per-bot vector collections, vector insertions, cosine similarity queries, and collection deletions. |
| **DocumentProcessor** | `document_processor.py` | Extracts text from uploaded PDF and DOCX files, cleans whitespace, and splits content into overlapping chunks. |
| **JSScraper** | `js_scraper.py` | Uses Playwright to render JavaScript single-page apps (SPAs) and extract dynamically loaded DOM text. |
| **URLScraper** | `url_scraper.py` | Static web crawler utilizing BeautifulSoup to parse HTML, strip scripts/styles, and follow links within domain boundaries. |
| **LanguageService** | `language_service.py` | Detects input language (Tamil, Hindi, Spanish, French, etc.) and translates prompts/responses when required. |
| **NL2SQLService** | `nl2sql_service.py` | Converts natural language analytical queries (*"Which bot had the most negative sentiment today?"*) into safe SQL queries. |
| **TelegramBot** | `telegram_bot.py` | Handles incoming updates from Telegram webhook endpoints, queries RAG pipeline, and replies via Telegram Bot API. |

---

## 7. RAG Ingestion & Query Pipeline

```
[ Ingest Sources: PDF / DOCX / Web URL ]
                  │
                  ▼
       [ Text Chunking Engine ]
    (Chunk Size: ~500-1000 tokens, 100 token overlap)
                  │
                  ▼
      [ Embedding Computation ]
    (fastembed / all-MiniLM-L6-v2)
                  │
                  ▼
      [ ChromaDB Vector Index ] (Collection: `bot_{chatbot_id}`)
```

### Query Execution Cycle:
1. **User Query Received**: Input query is received via Web / Telegram.
2. **Language Detection**: Determines whether translation or multilingual prompt instructions are needed.
3. **Vector Similarity Search**: Converts question to embedding and retrieves top-$k$ ($k=3\dots5$) context chunks from ChromaDB.
4. **Prompt Assembly**: Combines system instructions, conversation history, retrieved context, and the user query.
5. **Streaming Generation**: Dispatches prompt to Groq LPU engine; streams tokens back to client using Server-Sent Events.

---

## 8. Database Schema & Data Models

Managed via **Prisma ORM** for PostgreSQL (`frontend/prisma/schema.prisma`):

### Core Entities:
- **`User`**: Tenant account owner (`id`, `email`, `role: ADMIN | WORKSPACE`, `plan: FREE | STARTER | PRO | ENTERPRISE`).
- **`Chatbot`**: Assistant entity (`id`, `userId`, `name`, `systemPrompt`, `primaryColor`, `welcomeMessage`, `privacyLevel`, `telegramToken`).
- **`Document`**: Ingested knowledge item (`id`, `chatbotId`, `name`, `type: PDF | DOCX | URL | FAQ | TEXT`, `status: PENDING | PROCESSING | DONE | FAILED`, `chunkCount`).
- **`ChatSession`**: Visitor conversation session (`id`, `chatbotId`, `visitorId`, `language`, `sentiment`, `sentimentScore`, `needsFollowUp`).
- **`Message`**: Individual chat message (`id`, `sessionId`, `role: USER | ASSISTANT`, `content`, `tokens`, `confidence`).
- **`FeedbackTicket`**: Human support ticket (`id`, `chatbotId`, `visitorId`, `category`, `status: OPEN | ESCALATED_TO_ADMIN | RESOLVED | CLOSED`, `description`, `adminResponse`).
- **`Payment`**: Razorpay transaction log (`id`, `userId`, `razorpayOrderId`, `amount`, `status: PENDING | SUCCESS | FAILED`).

---

## 9. Omnichannel Deployment (Web Widget & Telegram)

### 1. Web Embed Widget (`embed/`)
Add this script to any website HTML:

```html
<script 
  src="https://your-domain.com/embed.js" 
  data-chatbot-id="YOUR_CHATBOT_ID"
  data-primary-color="#6366f1"
  defer>
</script>
```

### 2. Telegram Bot Integration
1. Obtain bot token from `@BotFather`.
2. Save token in the Chatbot settings in the Admin Dashboard.
3. The platform registers the webhook with Telegram:
   ```
   POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://your-domain.com/api/webhooks/telegram
   ```
4. Inbound Telegram messages are processed through the RAG engine and dispatched instantly back to the Telegram chat.

---

## 10. n8n Automation & Escalations

The platform features pre-built n8n workflows (`n8n-workflows/`):

- **`escalation-trigger.json`**: Listens for webhooks when a customer chat flags negative sentiment or requests a human agent. Sends an instant Slack / Telegram / Email notification to support agents.
- **`daily-analytics-digest.json`**: Scheduled workflow querying the NL2SQL analytics engine every 24 hours and sending a summary report to workspace admins.
- **`ticket-sync.json`**: Syncs resolved or escalated `FeedbackTicket` records to external CRMs (Zendesk / Freshdesk / HubSpot).

---

## 11. Complete API Reference

### Backend Endpoints (FastAPI `:8000`)

| Method | Endpoint | Request Body / Params | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/chat/message` | `{ chatbot_id, message, session_id, language }` | Streams LLM response using Server-Sent Events. |
| `POST` | `/ingest/file` | `multipart/form-data (file, chatbot_id)` | Ingests PDF/DOCX, chunks, and inserts into ChromaDB. |
| `POST` | `/ingest/url` | `{ chatbot_id, url, use_js_scraper }` | Crawls website (static or Playwright SPA) and indexes. |
| `POST` | `/ingest/raw-text` | `{ chatbot_id, title, content }` | Manually inserts raw text into the vector knowledge base. |
| `GET` | `/health` | None | Returns backend, ChromaDB, and LLM connectivity status. |
| `POST` | `/analytics/nl2sql` | `{ query, chatbot_id }` | Executes a natural language analytics query against PostgreSQL. |
| `POST` | `/telegram/webhook` | Telegram Update Object | Ingests and responds to Telegram user messages. |

### Frontend Proxy Endpoints (Next.js `:3000`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | Proxies streaming chat request to FastAPI backend with session logging. |
| `GET/POST`| `/api/chatbot` | Lists or creates chatbots for the authenticated user. |
| `POST` | `/api/knowledge/upload` | Handles authenticated file uploads to the backend ingestion service. |
| `POST` | `/api/payments/create-order`| Creates Razorpay order for subscription upgrades. |
| `POST` | `/api/payments/verify` | Verifies Razorpay HMAC signature and upgrades user plan. |
| `POST` | `/api/webhooks/n8n` | Receives automation callbacks from n8n workflows. |

---

## 12. Environment Variables & Deployment

### Essential Environment Variables (`.env`)

```env
# Database Connections
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_support_db"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/ai_support_db"

# NextAuth Configuration
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI & LLM Providers
GROQ_API_KEY="gsk_..."
ANTHROPIC_API_KEY="sk-ant-..."

# Backend & Vector Store
BACKEND_URL="http://localhost:8000"
CHROMA_PERSIST_DIRECTORY="./chroma_db"

# Payment Gateway
RAZORPAY_KEY_ID="rzp_live_..."
RAZORPAY_KEY_SECRET="your-razorpay-secret"

# n8n Automation
N8N_WEBHOOK_URL="http://localhost:5678/webhook/escalate"
```

### Quickstart Commands

```bash
# 1. Start all services with Docker Compose
docker-compose up -d --build

# Or run services locally:

# 2. Start FastAPI backend
cd backend
python -m venv .venv
source .venv/bin/activate # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Start Next.js frontend
cd frontend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
