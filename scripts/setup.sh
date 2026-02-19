#!/usr/bin/env bash
# scripts/setup.sh – First-time project setup
set -euo pipefail

echo "==> ChatBot AI — Project Setup"

# Check prerequisites
for cmd in docker docker-compose node npm python3; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is not installed or not in PATH."
    exit 1
  fi
done

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  Created .env from .env.example — please fill in your API keys."
else
  echo "  .env already exists, skipping."
fi

# Install frontend deps
echo "==> Installing frontend dependencies …"
cd frontend
npm install
cd ..

# Install embed widget deps
echo "==> Installing embed widget dependencies …"
cd embed
npm install
cd ..

# Build Docker images
echo "==> Building Docker images …"
docker-compose build

echo ""
echo "Setup complete! Next steps:"
echo "  1. Edit .env and set ANTHROPIC_API_KEY, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET"
echo "  2. Run: make dev"
echo "  3. In another terminal: make migrate && make seed"
echo "  4. Open http://localhost:3000"
