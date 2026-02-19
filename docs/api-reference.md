# API Reference

All Next.js API routes are under `/api`. The FastAPI backend runs at `http://backend:8000` (Docker) or `http://localhost:8000` (local dev).

---

## Next.js API Routes

### Authentication

#### `GET/POST /api/auth/[...nextauth]`
Handled by NextAuth.js. Supports Google OAuth and email magic links.

---

### Chat

#### `POST /api/chat`
Stream an AI response for a chat message.

**Request body:**
```json
{
  "chatbotId": "string",
  "sessionId": "string",          // optional – created if omitted
  "message": "string",
  "visitorId": "string"           // optional
}
```

**Response:** `text/event-stream` (SSE)
```
data: {"content": "Hello "}
data: {"content": "world"}
data: [DONE]
```

**Response headers:**
- `X-Session-Id`: the session ID (new or existing)

---

### Chatbots

#### `GET /api/chatbot`
List all chatbots for the authenticated user.

**Response:** `{ chatbots: Chatbot[] }`

#### `POST /api/chatbot`
Create a new chatbot.

**Request body:**
```json
{
  "name": "Support Bot",
  "description": "...",
  "personality": "friendly",
  "welcomeMessage": "Hi! How can I help?",
  "primaryColor": "#6366f1",
  "language": "English"
}
```

#### `GET /api/chatbot/[id]`
Get a single chatbot (owner only).

#### `PUT /api/chatbot/[id]`
Update a chatbot.

#### `DELETE /api/chatbot/[id]`
Delete a chatbot and all associated data.

---

### Knowledge Base

#### `POST /api/knowledge/upload`
Upload a file (PDF, DOCX, TXT) for a chatbot.

**Request:** `multipart/form-data`
- `chatbotId` (string)
- `file` (File)

#### `POST /api/knowledge/faq`
Add FAQ pairs.

**Request body:**
```json
{
  "chatbotId": "string",
  "pairs": [
    { "question": "What are your hours?", "answer": "We're open 9am–5pm." }
  ]
}
```

#### `DELETE /api/knowledge/[id]`
Delete a document and remove its embeddings from ChromaDB.

---

### Analytics

#### `GET /api/analytics`
Get aggregated stats for the authenticated user.

**Query params:**
- `period` – `daily` | `weekly` | `monthly` (default `weekly`)

**Response:**
```json
{
  "totalSessions": 142,
  "totalMessages": 891,
  "totalChatbots": 3,
  "recentSessions": [...]
}
```

#### `POST /api/analytics/nl-query`
Ask a natural-language question about your data (NL2SQL).

**Request body:**
```json
{ "question": "How many messages were sent last week?" }
```

**Response:**
```json
{
  "sql": "SELECT COUNT(*) ...",
  "rows": [{ "count": 143 }],
  "count": 1
}
```

---

### Embed Script

#### `GET /api/embed/[botId]`
Returns the JavaScript embed snippet for a chatbot.

---

### n8n Webhooks

#### `POST /api/webhooks/n8n`
Internal webhook consumed by n8n workflows.

**Request body:**
```json
{
  "event": "new_conversation | escalation | daily_report | lead_captured",
  "data": { ... }
}
```

---

## FastAPI Backend Routes

Base URL: `http://backend:8000`

### `GET /health`
Returns `{ "status": "ok" }`.

### `POST /chat/message`
Stream an AI response using RAG.

**Request body:**
```json
{
  "chatbot_id": "string",
  "session_id": "string",
  "message": "string",
  "history": [{ "role": "user|assistant", "content": "..." }],
  "visitor_id": "string"
}
```

**Response:** `text/event-stream`
```
data: {"content": "hello"}
data: [DONE]
```

### `POST /ingest/document`
Ingest a file (multipart form).

### `POST /ingest/faq`
Ingest FAQ pairs.

### `POST /ingest/url`
Scrape and ingest a URL.

### `DELETE /ingest/document/{chatbot_id}/{document_id}`
Remove document embeddings.

### `GET /embeddings/status/{chatbot_id}`
Returns `{ "chunk_count": 42 }`.
