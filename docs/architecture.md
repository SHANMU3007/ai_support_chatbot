# Architecture Overview

## System Diagram

```
Browser / Customer Website
        │
        │  embed.js (vanilla JS / React IIFE)
        ▼
┌─────────────────────────────────────────────┐
│           Next.js 14 Frontend               │
│   (App Router · TypeScript · Tailwind CSS)  │
│                                             │
│  Pages: Landing, Auth, Dashboard, Chat      │
│  API Routes: /api/chat  /api/chatbot        │
│             /api/knowledge  /api/analytics  │
│             /api/embed  /api/webhooks/n8n   │
└──────────────┬──────────────────────────────┘
               │ HTTP / SSE
               ▼
┌─────────────────────────────────────────────┐
│         FastAPI Backend (Python)            │
│                                             │
│  POST /chat/message  → SSE stream           │
│  POST /ingest/*      → background task      │
│  GET  /embeddings/status                    │
│  GET  /health                               │
└──────┬──────────────┬───────────────────────┘
       │              │
       ▼              ▼
┌──────────┐   ┌──────────────┐
│ ChromaDB │   │  PostgreSQL  │
│ (vectors)│   │  (app data)  │
└──────────┘   └──────────────┘
       │
       ▼
┌──────────────┐
│  Anthropic   │
│  Claude API  │
│(claude-son.. │
│   -4-6)      │
└──────────────┘

Redis ←── BullMQ (queued ingestion jobs, future)

n8n ←── Webhooks from Next.js API routes
         (escalation, new session, daily report, lead capture)
```

## Technology Choices

| Layer | Technology | Reason |
|---|---|---|
| Frontend framework | Next.js 14 App Router | Full-stack React with built-in API routes, streaming |
| UI components | shadcn/ui + Tailwind CSS | Accessible, composable, no runtime overhead |
| Auth | NextAuth.js + Prisma Adapter | Google OAuth + email magic links, session management |
| Database ORM | Prisma | Type-safe schema migrations and queries |
| AI model | Anthropic Claude | Excellent long-context, streaming, safety |
| Vector DB | ChromaDB | Simple HTTP API, cosine similarity, per-chatbot collections |
| Embeddings | sentence-transformers `all-MiniLM-L6-v2` | Fast, accurate, runs on CPU |
| Backend | FastAPI | Async Python, native SSE, Pydantic validation |
| Cache / Queue | Redis + BullMQ | Session cache, background job queue |
| Automation | n8n | No-code workflow engine, self-hosted |
| File parsing | PyMuPDF + python-docx | PDF and DOCX text extraction |
| Containerization | Docker Compose | Reproducible local and production setup |

## Request Flow – Chat Message

```
1. Customer types a message in the embed widget
2. Widget sends POST /api/chat  (Next.js)
3. Next.js saves the user message to PostgreSQL (Prisma)
4. Next.js forwards the request to FastAPI POST /chat/message
5. FastAPI:
   a. Embeds the message with sentence-transformers
   b. Queries ChromaDB for top-5 similar chunks (cosine similarity)
   c. Builds a system prompt with the retrieved context
   d. Streams Claude API response via SSE
6. Next.js pipes the SSE stream back to the browser
7. Next.js saves the assistant reply to PostgreSQL
8. If the message triggers escalation, a webhook fires to n8n
```

## Document Ingestion Flow

```
1. User uploads a file (or submits FAQ / URL) in the dashboard
2. Next.js creates a Document record in PostgreSQL (status=PROCESSING)
3. Next.js POSTs the file to FastAPI POST /ingest/document (as background task)
4. FastAPI:
   a. Extracts text with PyMuPDF / python-docx / URL scraper
   b. Splits into 500-token chunks with 50-token overlap
   c. Generates embeddings for each chunk
   d. Upserts chunks into ChromaDB collection bot_{chatbot_id}
5. (Future) Next.js polls or receives a webhook to update Document.status=DONE
```

## Security Considerations

- All API routes validate `session.user.id` against the chatbot owner
- NL2SQL only allows SELECT statements and always includes the user's `userId` in the WHERE clause
- ChromaDB collection names are namespaced per chatbot ID
- CORS is restricted to the configured `ALLOWED_ORIGINS`
- The embed.js is served with `Access-Control-Allow-Origin: *` for cross-site embedding
