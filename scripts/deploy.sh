#!/bin/bash
set -euo pipefail

# EDU Passport Docker Deployment Script
# Usage: ./scripts/deploy.sh [up|down|logs|migrate|seed|restart]

COMPOSE_FILE="docker-compose.yml"
PROJECT_NAME="edupassport"

# Check .env file exists
if [ ! -f .env ]; then
  echo "❌ .env file not found. Copy .env.example to .env and fill in values."
  exit 1
fi

case "${1:-up}" in
  up)
    echo "🚀 Starting EDU Passport..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" up -d --build
    echo "⏳ Waiting for services to be healthy..."
    sleep 5
    echo "🔄 Running database migrations..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec app npx prisma migrate deploy
    echo "✅ EDU Passport is running at http://localhost:${APP_PORT:-3000}"
    ;;
  down)
    echo "🛑 Stopping EDU Passport..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
    echo "✅ Stopped."
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" logs -f "${2:-app}"
    ;;
  migrate)
    echo "🔄 Running database migrations..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec app npx prisma migrate deploy
    echo "✅ Migrations applied."
    ;;
  seed)
    echo "🌱 Seeding database..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" exec app npx tsx prisma/seed.ts
    echo "✅ Database seeded."
    ;;
  restart)
    echo "🔄 Restarting app..."
    docker compose -f "$COMPOSE_FILE" -p "$PROJECT_NAME" restart app
    echo "✅ App restarted."
    ;;
  *)
    echo "Usage: $0 {up|down|logs|migrate|seed|restart}"
    exit 1
    ;;
esac
