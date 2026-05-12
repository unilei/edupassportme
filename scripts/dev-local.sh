#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-edupassport-local}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker is required for local PostgreSQL."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERROR] Docker Compose v2 is required."
  exit 1
fi

if [ ! -f .env ]; then
  echo "[INFO] .env not found. Creating it from .env.example."
  cp .env.example .env
fi

set -a
source .env
set +a

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL is not set in .env."
  exit 1
fi

eval "$(
  node <<'NODE'
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) process.exit(0);

const quote = (value) => `'${String(value).replace(/'/g, "'\\''")}'`;
const url = new URL(databaseUrl);

console.log(`DB_URL_USER=${quote(decodeURIComponent(url.username || "postgres"))}`);
console.log(`DB_URL_PASSWORD=${quote(decodeURIComponent(url.password || "postgres"))}`);
console.log(`DB_URL_NAME=${quote(decodeURIComponent(url.pathname.replace(/^\//, "") || "fxxknav"))}`);
console.log(`DB_URL_PORT=${quote(url.port || "5432")}`);
NODE
)"

export POSTGRES_USER="${POSTGRES_USER:-$DB_URL_USER}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$DB_URL_PASSWORD}"
export POSTGRES_DB="${POSTGRES_DB:-$DB_URL_NAME}"
export POSTGRES_PORT="${POSTGRES_PORT:-$DB_URL_PORT}"

DEV_HOST="${DEV_HOST:-127.0.0.1}"
DEV_PORT="${DEV_PORT:-${APP_PORT:-3000}}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
DB_NAME="${POSTGRES_DB:-fxxknav}"

echo "[INFO] Starting PostgreSQL..."
docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" up -d postgres

echo "[INFO] Waiting for PostgreSQL to accept connections..."
for attempt in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" exec -T postgres pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "[ERROR] PostgreSQL did not become ready in time."
    docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" logs --tail=80 postgres
    exit 1
  fi

  sleep 1
done

if ! docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
  echo "[INFO] Ensuring PostgreSQL role and database from DATABASE_URL exist..."
  docker compose -f "$COMPOSE_FILE" -p "$COMPOSE_PROJECT_NAME" exec -T postgres psql -v ON_ERROR_STOP=1 -U postgres -d postgres \
    -v db_user="$DB_USER" \
    -v db_password="$DB_PASSWORD" \
    -v db_name="$DB_NAME" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_user', :'db_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user') \gexec
ALTER ROLE :"db_user" WITH PASSWORD :'db_password';
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name') \gexec
ALTER DATABASE :"db_name" OWNER TO :"db_user";
\connect :"db_name"
ALTER SCHEMA public OWNER TO :"db_user";
GRANT ALL ON SCHEMA public TO :"db_user";
SQL
fi

echo "[INFO] Applying Prisma migrations..."
npx prisma migrate deploy

echo "[INFO] Generating Prisma client..."
npx prisma generate

if [ "${SEED_DB:-0}" = "1" ]; then
  echo "[INFO] Seeding database because SEED_DB=1..."
  npm run db:seed
fi

echo "[INFO] Starting Next.js dev server at http://${DEV_HOST}:${DEV_PORT}"
exec npx next dev -H "$DEV_HOST" -p "$DEV_PORT"
