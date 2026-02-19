.PHONY: dev build stop migrate seed logs clean setup help

# Default target
help:
	@echo "AI Support Chatbot - Available Commands:"
	@echo ""
	@echo "  make setup    - First-time setup (copy env, install deps)"
	@echo "  make dev      - Start all services in dev mode (hot reload)"
	@echo "  make build    - Build all Docker images"
	@echo "  make stop     - Stop all running services"
	@echo "  make migrate  - Run Prisma database migrations"
	@echo "  make seed     - Seed demo data into the database"
	@echo "  make logs     - Tail logs from all services"
	@echo "  make clean    - Remove all containers and volumes"
	@echo ""

setup:
	@echo "Setting up AI Support Chatbot..."
	@cp -n .env.example .env || echo ".env already exists, skipping"
	@cd frontend && npm install
	@cd embed && npm install
	@echo ""
	@echo "✅ Setup complete! Edit .env with your API keys, then run: make dev"

dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up

dev-detached:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

build:
	docker compose build

stop:
	docker compose down

migrate:
	@echo "Running Prisma migrations..."
	cd frontend && npx prisma migrate deploy
	@echo "✅ Migrations complete"

migrate-dev:
	@echo "Creating new migration..."
	cd frontend && npx prisma migrate dev

seed:
	@echo "Seeding demo data..."
	cd frontend && npx tsx prisma/seed.ts
	@echo "✅ Demo data seeded"

generate:
	cd frontend && npx prisma generate

studio:
	cd frontend && npx prisma studio

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

clean:
	docker compose down -v --remove-orphans
	@echo "✅ All containers and volumes removed"

test:
	@echo "Running backend tests..."
	cd backend && python -m pytest tests/ -v

embed-build:
	@echo "Building embeddable widget..."
	cd embed && npm run build
	cp embed/dist/widget.js frontend/public/embed.js
	@echo "✅ Widget built and copied to frontend/public/embed.js"

ps:
	docker compose ps
