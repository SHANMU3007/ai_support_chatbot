#!/usr/bin/env bash
# scripts/generate-embed.sh – Build the embed widget and copy to frontend/public/
set -euo pipefail

echo "==> Building embed widget …"
cd "$(dirname "$0")/../embed"

if [ ! -d node_modules ]; then
  echo "  Installing embed dependencies …"
  npm install
fi

npm run build

echo ""
echo "Embed widget built → frontend/public/embed.js"
echo "Reference it in your HTML with:"
echo '  <script src="https://yourapp.com/embed.js" data-bot-id="YOUR_BOT_ID"></script>'
