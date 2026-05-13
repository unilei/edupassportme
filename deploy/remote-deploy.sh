#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_INPUT="${ENV_INPUT:-.env.production}"
ENV_FILE="${ENV_FILE:-.env}"
PROJECT_NAME="${PROJECT_NAME:-edupassport}"
APP_PORT="${APP_PORT:-3000}"

if ! command -v docker >/dev/null 2>&1; then
  echo "[ERROR] Docker is required on the deployment server."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "[ERROR] Docker Compose v2 is required on the deployment server."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "[ERROR] Missing $COMPOSE_FILE in $(pwd)."
  exit 1
fi

if [ ! -f "$ENV_INPUT" ]; then
  echo "[ERROR] Missing $ENV_INPUT in $(pwd)."
  exit 1
fi

set -a
source "$ENV_INPUT"
set +a

if [ -z "${GHCR_USERNAME:-}" ] || [ -z "${GHCR_TOKEN:-}" ]; then
  echo "[ERROR] GHCR_USERNAME and GHCR_TOKEN are required for pulling the production image."
  exit 1
fi

if [ -z "${APP_IMAGE:-}" ]; then
  echo "[ERROR] APP_IMAGE is required."
  exit 1
fi

echo "[INFO] Logging in to GHCR..."
printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin >/dev/null

echo "[INFO] Writing Docker Compose environment..."
grep -vE '^(GHCR_USERNAME|GHCR_TOKEN)=' "$ENV_INPUT" > "$ENV_FILE"
chmod 600 "$ENV_FILE"
rm -f "$ENV_INPUT"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" -p "$PROJECT_NAME" "$@"
}

echo "[INFO] Pulling production image: $APP_IMAGE"
compose pull app migrate

echo "[INFO] Starting PostgreSQL..."
compose up -d postgres

echo "[INFO] Waiting for PostgreSQL health..."
for attempt in $(seq 1 60); do
  if compose exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    break
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "[ERROR] PostgreSQL did not become healthy in time."
    compose logs --tail=120 postgres
    exit 1
  fi

  sleep 2
done

echo "[INFO] Running Prisma migrations..."
compose run --rm migrate

echo "[INFO] Updating app container..."
compose up -d app

echo "[INFO] Waiting for app health..."
for attempt in $(seq 1 60); do
  if command -v curl >/dev/null 2>&1; then
    if curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null; then
      echo "[INFO] App health check passed."
      docker image prune -f --filter "until=24h" >/dev/null || true
      exit 0
    fi
  elif command -v wget >/dev/null 2>&1; then
    if wget -q --spider "http://127.0.0.1:${APP_PORT}/api/health"; then
      echo "[INFO] App health check passed."
      docker image prune -f --filter "until=24h" >/dev/null || true
      exit 0
    fi
  else
    if [ "$attempt" -eq 1 ]; then
      echo "[WARN] curl/wget not found; falling back to Docker health status."
    fi
    health_status="$(docker inspect --format='{{.State.Health.Status}}' "${PROJECT_NAME}-app-1" 2>/dev/null || true)"
    if [ "$health_status" = "healthy" ]; then
      echo "[INFO] App Docker health check passed."
      docker image prune -f --filter "until=24h" >/dev/null || true
      exit 0
    fi
  fi

  if [ "$attempt" -eq 60 ]; then
    echo "[ERROR] App did not pass health check in time."
    compose ps
    compose logs --tail=160 app
    exit 1
  fi

  sleep 2
done
