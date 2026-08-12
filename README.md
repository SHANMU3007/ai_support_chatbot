# 🤖 AI Customer Support Chatbot SaaS Platform

> **Build, customize, and deploy AI-powered customer support chatbots trained on your own documents and websites in under 60 seconds.**

---

## 🌟 Overview: What is this project?

Imagine ChatGPT, but **100% customized for your business or organization**.

This project is a **Full-Stack, Multi-Tenant AI Customer Support SaaS Platform**. It allows any enterprise, online store, or organization to:
1. **Upload Knowledge**: Drop in PDFs, Word docs, FAQs, or paste website links.
2. **Train an AI Assistant**: Automatically convert company data into an intelligent vector knowledge base.
3. **Deploy Anywhere**: Embed a chat widget onto any website with a single `<script>` tag, or connect it directly to a **Telegram Bot** or **Voice Interface**.
4. **Sub-Second Speed**: Powered by **Groq LPU hardware** (`llama-3.3-70b-versatile`), streaming answers at **~500 tokens per second**.

---

## 💡 How It Works (Explain to a Friend / ELI5)

If you're explaining this to a friend, here is the simple 4-step story:

```
[ Your Files / Website ]  ➜  [ Vector Engine (ChromaDB) ]  ➜  [ Groq AI Brain ]  ➜  [ Instant Answer ]
```

1. **Information Ingestion**: You give the platform your company's refund policy PDF or website URL. The system reads it, splits it into small paragraphs, and saves them as mathematical "vectors" in ChromaDB.
2. **User Asks a Question**: A customer visits your site and asks, *"What is your return policy for damaged goods?"*
3. **Smart Retrieval (RAG)**: The backend instantly searches ChromaDB for the top 3 paragraphs in your documents that talk about returned damaged goods.
4. **Fast AI Generation**: The backend feeds those 3 paragraphs to the **Groq Llama 3.3 70B AI model**, which crafts a natural, friendly response grounded **strictly** in your official policy—in less than 1 second!

---

## ✨ Core Features

* 🚀 **Sub-Second Streaming Answers**: Powered by Groq's LPU acceleration (~500 tokens/sec).
* 📄 **Multi-Source Knowledge Ingestion**: Supports PDFs, DOCX, TXT, static URLs, and dynamic JavaScript-rendered web pages.
* 🗣️ **Regional Voice & Language Support**: Talk to the bot via voice or text in regional languages (Tamil, Hindi, English, etc.).
* 💬 **Omnichannel Deployment**:
  * **Web Embed Widget**: Drop a `<script>` tag on any HTML site.
  * **Telegram Bot**: Connect a Telegram token to let customers chat via Telegram.
* 📊 **Admin Dashboard & NL2SQL Analytics**: Ask analytics questions in plain English (*"Show me top 5 asked questions this week"*).
* 🔄 **Smart Fallback System**: Automatically switches to fallback models (`llama-3.1-8b` / `gemma2-9b`) if rate limits are hit.
* ⚡ **Automation with n8n**: Triggers external webhooks or email alerts when human escalation is flagged.

---

## 🏗️ Architecture & Data Flow

```mermaid
graph TD
    subgraph Client Apps
        A1[Web Embed Widget]
        A2[Telegram Bot]
        A3[Next.js Admin Dashboard]
    end

    subgraph Backend Server (FastAPI Port 8000)
        B[API Router & Handler]
        C[Language & Pre-processor]
        D[RAG Engine]
    end

    subgraph Storage & AI Services
        E[(ChromaDB Vector Store)]
        F[(PostgreSQL Database)]
        G[Groq LPU AI Engine<br/>llama-3.3-70b-versatile]
        H[n8n Automation Workflows]
    end

    A1 -->|Query / Voice| B
    A2 -->|Telegram Webhook| B
    A3 -->|Upload Knowledge / Docs| B
    
    B --> C
    C --> D
    D -->|Semantic Search| E
    E -->|Relevant Context| D
    D -->|Context + Query| G
    G -->|Streaming SSE Response| A1
    B -->|Save Chat Logs| F
    B -->|Trigger Escalations| H
```

---

## 🛠️ Detailed Tech Stack & Where It Works in the Project

Here is the breakdown of every technology used in this project, why it was chosen, and **exactly where it runs** in the codebase:

### 1. **Next.js 14 (App Router) + TypeScript**
* **Role**: Full-stack web dashboard & API gateway. Handles user interface, admin management, authentication, and chat proxying.
* **Where it works**:
  * `frontend/src/app/(dashboard)/`: Admin dashboard pages for managing chatbots, documents, conversations, and health metrics.
  * `frontend/src/app/api/chat/route.ts`: API route streaming chat requests between web clients and the FastAPI backend.
  * `frontend/src/app/(auth)/`: Login and registration pages.

### 2. **Python FastAPI**
* **Role**: High-performance, asynchronous backend engine dedicated to AI processing, document parsing, vector retrieval, and LLM response streaming.
* **Where it works**:
  * `backend/main.py`: Entry point for the FastAPI application (running on Port 8000).
  * `backend/app/routers/chat.py`: Handles `/chat/message` Server-Sent Events (SSE) streaming endpoint.
  * `backend/app/routers/ingest.py`: Document & URL file ingestion endpoints.
  * `backend/app/routers/telegram.py`: Handles Telegram bot webhook events.

### 3. **Groq LPU Acceleration (`llama-3.3-70b-versatile`)**
* **Role**: Ultra-fast Language Processing Unit (LPU) cloud inference engine, generating response streams at ~500 tokens/second.
* **Where it works**:
  * `backend/app/services/ai_engine.py`: Interacts with the Groq SDK, executes system prompts with retrieved context, and manages automatic fallback to `llama-3.1-8b-instant` or `gemma2-9b-it` if rate limits occur.

### 4. **ChromaDB (Vector Database)**
* **Role**: Self-hosted, persistent vector database used for semantic search. Stores document embeddings broken down into text chunks.
* **Where it works**:
  * `backend/app/services/chroma_service.py`: Initializes persistent ChromaDB collections (isolated per chatbot ID), embeds document chunks, and executes cosine similarity searches.

### 5. **Sentence Transformers (`all-MiniLM-L6-v2`)**
* **Role**: Lightweight local neural network embedding model that converts text queries and documents into 384-dimensional dense vectors without third-party API costs.
* **Where it works**:
  * `backend/app/services/embedding_service.py`: Loads the model locally and generates text embeddings on demand.

### 6. **PostgreSQL 15 + Prisma ORM**
* **Role**: Primary relational database for persistent metadata storage (user accounts, chatbot settings, document lists, conversation sessions, and analytics).
* **Where it works**:
  * `frontend/prisma/schema.prisma`: Complete database schema definitions (User, Chatbot, Document, Session, Message, Sentiment).
  * `backend/app/database.py`: Async PostgreSQL database connector pool for Python backend queries.

### 7. **Redis 7**
* **Role**: High-speed in-memory database used for session caching and rate-limiting incoming API requests.
* **Where it works**:
  * Configured in `docker-compose.yml` and accessed across backend services for session memory management.

### 8. **n8n Automation Engine**
* **Role**: Self-hosted workflow automation tool for executing webhooks, sending email notifications, and managing human support escalations.
* **Where it works**:
  * `n8n-workflows/`: Contains JSON workflow templates that listen to escalation events emitted by FastAPI.

### 9. **Web Embed Widget (Vanilla JS / IIFE Bundle)**
* **Role**: Light-weight, self-contained JavaScript bundle that allows any external website to embed the chatbot widget in an iframe via a single `<script>` tag.
* **Where it works**:
  * `embed/`: Source code for the embed widget.
  * `frontend/public/embed.iife.js`: Compiled client widget script served directly by Next.js.

### 10. **Tailwind CSS + Shadcn UI**
* **Role**: Modern design system for responsive layout styling, dark mode support, and accessible UI components.
* **Where it works**:
  * `frontend/src/app/globals.css`, `frontend/tailwind.config.mjs`, and components under `frontend/src/components/`.

---

## 📁 Project Directory Structure

```text
ai-support-chatbot/
├── backend/                  # FastAPI AI Engine
│   ├── app/
│   │   ├── models/           # Pydantic data schemas
│   │   ├── routers/          # Chat, Ingest, Telegram, Analytics routes
│   │   ├── services/         # RAG, AI Engine, ChromaDB, Scraper services
│   │   └── utils/            # Prompt builders & helpers
│   ├── Dockerfile
│   └── main.py               # FastAPI entry point
│
├── frontend/                 # Next.js 14 Dashboard & Embed API
│   ├── prisma/               # Database schema & migrations
│   ├── src/
│   │   ├── app/              # Next.js app router pages & API routes
│   │   ├── components/       # UI & Chatbot components
│   │   ├── hooks/            # Speech recognition & TTS hooks
│   │   └── lib/              # Auth & database utilities
│   ├── public/               # Embeddable widget bundle (embed.iife.js)
│   └── Dockerfile
│
├── embed/                    # Standalone Embeddable JS Widget
├── n8n-workflows/            # Automation webhooks & notification flows
├── docker-compose.yml        # Multi-container production deployment
└── README.md                 # Project documentation
```

---

## 🚀 How to Run Locally

### Prerequisites
* **Node.js** v18+
* **Python** 3.10+
* **Docker & Docker Compose** (Optional but recommended)
* **Groq API Key** (Free from [groq.com](https://groq.com))

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/SHANMU3007/ai_support_chatbot.git
cd ai-support-chatbot
```

### Step 2: Set Up Environment Variables

**1. Backend `.env` (`backend/.env`):**
```env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/ai_chatbot
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

**2. Frontend `.env` (`frontend/.env`):**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/ai_chatbot
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
```

---

### Step 3: Run with Docker Compose (Recommended)

```bash
docker-compose up --build
```
* **Frontend Dashboard**: `http://localhost:3000`
* **FastAPI Docs**: `http://localhost:8000/docs`
* **ChromaDB**: `http://localhost:8001`

---

### Step 4: Run Manually (Development Mode)

#### 1. Start Backend (FastAPI):
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### 2. Start Frontend (Next.js):
```bash
cd frontend
npm install
npx prisma db push
npm run dev
```

Visit `http://localhost:3000` to create your first AI Chatbot!

---

## 🌐 Embed Widget Usage

To add your chatbot to any HTML website, paste this snippet right before the `</body>` tag:

```html
<script 
  src="http://localhost:3000/embed.iife.js" 
  data-chatbot-id="YOUR_CHATBOT_ID">
</script>
```

---

## 🔮 Future Roadmap

- [ ] **WhatsApp & Slack Integration**: Native bot connectors for enterprise messaging.
- [ ] **Real-Time Voice Calls**: WebRTC/Twilio AI phone agents.
- [ ] **Human-in-the-Loop Handover**: Seamless takeover by human live support agents when sentiment is negative.
- [ ] **On-Premise Enterprise Deployment**: Self-hosted LLM support via Ollama / VLLM.

---

⭐ **Star this repository if you find it helpful!**
