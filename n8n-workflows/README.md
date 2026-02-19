# n8n Workflows

Four pre-built n8n workflows for the ChatBot AI platform.

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
