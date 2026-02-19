# n8n Setup Guide

n8n is a self-hosted automation platform. It handles escalations, daily reports, and CRM integrations.

## Accessing n8n

After running `make dev`, n8n is available at **http://localhost:5678**.

Default credentials (first run):
- Username: `admin` (or set via `N8N_BASIC_AUTH_USER` in `.env`)
- Password: (set via `N8N_BASIC_AUTH_PASSWORD` in `.env`)

---

## Importing Workflows

1. Open http://localhost:5678
2. Click **Workflows** in the left sidebar
3. Click **Add Workflow → Import from File**
4. Import each JSON file from `n8n-workflows/`

---

## Configuring Credentials

### Email SMTP (for escalation + reports)
1. Go to **Settings → Credentials → New Credential**
2. Select **SMTP**
3. Fill in your SMTP host, port, username, and password

### Slack (for escalation alerts)
1. Create a Slack Incoming Webhook at https://api.slack.com/messaging/webhooks
2. Copy the webhook URL
3. In n8n: **Settings → Variables → Add Variable**
   - Name: `SLACK_WEBHOOK_URL`
   - Value: `https://hooks.slack.com/services/...`

---

## Environment Variables

Set these in n8n's **Settings → Variables** (not your `.env` file):

| Variable | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL |
| `NEXTJS_API_URL` | `http://frontend:3000` (Docker service name) |
| `REPORT_EMAIL` | Email address for daily reports |
| `CRM_API_URL` | Your CRM REST API base URL |

---

## Webhook URLs

Each workflow exposes a webhook. The Next.js app fires these automatically when events occur.

| Event | n8n Webhook Path |
|---|---|
| New conversation | `POST /webhook/new-conversation` |
| Escalation | `POST /webhook/escalation` |
| Lead captured | `POST /webhook/lead-capture` |

The base webhook URL is set in your `.env`:
```
N8N_WEBHOOK_URL=http://n8n:5678/webhook
```

---

## Activating Workflows

After importing, each workflow is **inactive** by default.

1. Open a workflow
2. Toggle the **Active** switch in the top-right corner
3. Confirm

---

## Testing Webhooks

Use the built-in **Execute Workflow** button, or send a test payload:

```bash
curl -X POST http://localhost:5678/webhook/new-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "event": "new_conversation",
    "data": {
      "sessionId": "test-123",
      "chatbotName": "Demo Bot",
      "ownerEmail": "you@example.com",
      "visitorId": "visitor-456",
      "startedAt": "2024-01-15T10:00:00Z"
    }
  }'
```

---

## Production Considerations

- Mount a persistent volume for n8n data (already configured in `docker-compose.yml`)
- Set `WEBHOOK_URL` in n8n settings to your public domain
- Enable HTTPS via a reverse proxy (Nginx/Caddy) in front of n8n
