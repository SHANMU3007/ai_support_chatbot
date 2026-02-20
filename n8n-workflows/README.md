# n8n Workflows

Five pre-built n8n workflows for the ChatBot AI platform.

## Import Instructions

1. Open your n8n instance at `http://localhost:5678`
2. Go to **Workflows → Import from File**
3. Import each `.json` file in this directory

## Workflows

### `new-conversation-alert.json`
**Trigger:** Webhook `POST /new-conversation`  
**Action:** Sends an email to the chatbot owner when a new chat session starts.  
**Payload expected:**
```json
{
  "event": "new_conversation",
  "data": {
    "sessionId": "...",
    "chatbotName": "...",
    "ownerEmail": "...",
    "visitorId": "...",
    "startedAt": "..."
  }
}
```

---

### `escalation-to-human.json`
**Trigger:** Webhook `POST /escalation`  
**Action:** Emails `support@yourcompany.com` and posts to Slack when a visitor requests human help.  
**Required env vars:** `SLACK_WEBHOOK_URL`  
**Payload expected:**
```json
{
  "event": "escalation",
  "data": {
    "sessionId": "...",
    "chatbotName": "...",
    "visitorId": "...",
    "lastMessage": "...",
    "timestamp": "..."
  }
}
```

---

### `daily-report-email.json`
**Trigger:** Cron at 08:00 daily  
**Action:** Fetches analytics from the Next.js API and emails a daily summary.  
**Required env vars:** `NEXTJS_API_URL`, `REPORT_EMAIL`

---

### `lead-capture-crm.json`
**Trigger:** Webhook `POST /lead-capture`  
**Action:** Creates a contact in your CRM API when a lead is captured via chat.  
**Required env vars:** `CRM_API_URL`  
**Payload expected:**
```json
{
  "event": "lead_captured",
  "data": {
    "email": "...",
    "name": "...",
    "chatbotName": "...",
    "sessionId": "..."
  }
}
```

## Environment Variables (set in n8n Settings → Variables)

| Variable | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |
| `NEXTJS_API_URL` | Base URL of the Next.js app, e.g. `http://frontend:3000` |
| `REPORT_EMAIL` | Email address to receive daily reports |
| `CRM_API_URL` | Your CRM API base URL |

## Webhook URLs

After importing, each workflow will have a webhook URL like:  
`http://localhost:5678/webhook/{path}`

Set `N8N_WEBHOOK_URL=http://n8n:5678/webhook` in your `.env` and the Next.js app will automatically POST to the correct paths.

---

### `telegram-bot.json`
**Trigger:** Telegram Bot (incoming messages)  
**Action:** Forwards user messages to the SupportIQ backend (`/chat/telegram` endpoint), then sends the AI response back to the Telegram user.  

#### Setup Instructions:

1. **Create a Telegram Bot:**
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` and follow the prompts to create a bot
   - Copy the **Bot Token** (e.g. `7123456789:AAH...`)

2. **Add Telegram Credentials in n8n:**
   - In n8n, go to **Settings → Credentials → Add Credential**
   - Choose **Telegram API**
   - Paste your Bot Token
   - Save it

3. **Import the Workflow:**
   - Go to **Workflows → Import from File**
   - Import `telegram-bot.json`

4. **Configure the Workflow:**
   - Open the workflow and click on the **"Send to SupportIQ Backend"** node
   - In the JSON body, replace `YOUR_CHATBOT_ID_HERE` with your actual chatbot ID
     - You can find this in your SupportIQ dashboard URL: `/chatbot/[THIS-IS-YOUR-ID]`
   - Update the URL if your backend is not on `localhost:8000`

5. **Activate the Workflow:**
   - Click the **Activate** toggle in the top-right corner
   - Your Telegram bot is now live!

**API Endpoint Used:** `POST /chat/telegram`  
**Request Body:**
```json
{
  "chatbot_id": "your-chatbot-id",
  "session_id": "tg_123456789",
  "message": "What services do you offer?",
  "visitor_id": "telegram_987654321",
  "history": []
}
```
**Response:**
```json
{
  "reply": "We offer hair styling, facials, spa treatments...",
  "chatbot_id": "your-chatbot-id",
  "session_id": "tg_123456789"
}
```
