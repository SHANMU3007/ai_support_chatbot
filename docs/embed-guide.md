# Embed Widget Guide

The ChatBot AI embed widget lets you add a floating chat button to any website with a single `<script>` tag.

---

## Quick Start

Add this tag before `</body>` on your website:

```html
<script
  src="https://your-chatbotai-domain.com/embed.js"
  data-bot-id="YOUR_BOT_ID"
  data-color="#6366f1">
</script>
```

Replace:
- `your-chatbotai-domain.com` with your deployed app URL
- `YOUR_BOT_ID` with the chatbot ID from your dashboard (Settings → Embed)
- `#6366f1` with your brand color (optional)

---

## Attributes

| Attribute | Required | Default | Description |
|---|---|---|---|
| `data-bot-id` | **Yes** | – | The chatbot ID from your dashboard |
| `data-color` | No | `#6366f1` | Primary color for the floating button |
| `data-base-url` | No | Script origin | Base URL of the ChatBot AI app |

---

## Embed Options

### 1. Script Tag (Recommended)
The floating bubble button with an iframe chat window.

```html
<script src="https://yourapp.com/embed.js" data-bot-id="abc123"></script>
```

### 2. Inline iframe
Embed the chat directly in your page layout:

```html
<iframe
  src="https://yourapp.com/chat/abc123"
  width="400"
  height="600"
  style="border:none;border-radius:12px;"
  title="Support Chat">
</iframe>
```

### 3. Direct Link
Share a standalone chat page with customers:

```
https://yourapp.com/chat/abc123
```

---

## Building the Embed (Developers)

The embed widget source lives in `embed/`. It's a standalone React app bundled as an IIFE with Vite.

```bash
# From repo root
make embed-build
# or manually:
cd embed && npm install && npm run build
```

This writes `frontend/public/embed.js`.

To test locally:

```html
<!-- test.html -->
<script src="http://localhost:3000/embed.js" data-bot-id="demo-chatbot-id"></script>
```

---

## Customisation

### CSS Variables
The embed widget uses a Shadow DOM so it won't interfere with your website's styles.

To use a different button position, you can override via JavaScript before the script loads:

```html
<script>
  window.ChatBotAIConfig = {
    baseUrl: "https://yourapp.com"
  };
</script>
<script src="https://yourapp.com/embed.js" data-bot-id="YOUR_BOT_ID"></script>
```

---

## Content Security Policy

If your site uses CSP, add these directives:

```
script-src 'self' https://yourapp.com;
frame-src 'self' https://yourapp.com;
connect-src 'self' https://yourapp.com;
```
