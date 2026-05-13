#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-unilei/edupassportme}"
ENV_FILE="${ENV_FILE:-deploy/.env.production}"
DEPLOY_HOST="${DEPLOY_HOST:-209.54.106.114}"
DEPLOY_USER="${DEPLOY_USER:-root}"
DEPLOY_PORT="${DEPLOY_PORT:-22}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/edupassport.me}"
DEPLOY_SSH_KEY_PATH="${DEPLOY_SSH_KEY_PATH:-$HOME/.ssh/aipan_prod_root}"

if ! command -v gh >/dev/null 2>&1; then
  echo "[ERROR] gh CLI is required."
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "[ERROR] Missing $ENV_FILE."
  exit 1
fi

if [ ! -f "$DEPLOY_SSH_KEY_PATH" ]; then
  echo "[ERROR] Missing SSH key: $DEPLOY_SSH_KEY_PATH"
  exit 1
fi

set -a
source "$ENV_FILE"
set +a

set_secret() {
  local name="$1"
  local value="${2:-}"

  if [ -z "$value" ]; then
    echo "[SKIP] secret:$name is empty"
    return
  fi

  printf '%s' "$value" | gh secret set "$name" -R "$REPO" >/dev/null
  echo "[OK] secret:$name"
}

set_variable() {
  local name="$1"
  local value="${2:-}"

  if [ -z "$value" ]; then
    echo "[SKIP] variable:$name is empty"
    return
  fi

  printf '%s' "$value" | gh variable set "$name" -R "$REPO" >/dev/null
  echo "[OK] variable:$name"
}

echo "[INFO] Configuring GitHub repository: $REPO"

set_secret DEPLOY_HOST "$DEPLOY_HOST"
set_secret DEPLOY_USER "$DEPLOY_USER"
gh secret set DEPLOY_SSH_KEY -R "$REPO" < "$DEPLOY_SSH_KEY_PATH" >/dev/null
echo "[OK] secret:DEPLOY_SSH_KEY"

set_secret POSTGRES_PASSWORD "${POSTGRES_PASSWORD:-}"
set_secret NEXTAUTH_SECRET "${NEXTAUTH_SECRET:-}"
set_secret NEXTAUTH_URL "${NEXTAUTH_URL:-}"
set_secret NEXT_PUBLIC_SITE_URL "${NEXT_PUBLIC_SITE_URL:-}"
set_secret ADMIN_PASSWORD "${ADMIN_PASSWORD:-}"
set_secret CRON_SECRET "${CRON_SECRET:-}"
set_secret UDEMY_API_KEY "${UDEMY_API_KEY:-}"
set_secret SMTP_HOST "${SMTP_HOST:-}"
set_secret SMTP_USER "${SMTP_USER:-}"
set_secret SMTP_PASS "${SMTP_PASS:-}"
set_secret STRIPE_SECRET_KEY "${STRIPE_SECRET_KEY:-}"
set_secret STRIPE_WEBHOOK_SECRET "${STRIPE_WEBHOOK_SECRET:-}"
set_secret STRIPE_PRO_MONTHLY_PRICE_ID "${STRIPE_PRO_MONTHLY_PRICE_ID:-}"
set_secret STRIPE_PRO_YEARLY_PRICE_ID "${STRIPE_PRO_YEARLY_PRICE_ID:-}"
set_secret OPENAI_API_KEY "${OPENAI_API_KEY:-}"

set_variable DEPLOY_PORT "$DEPLOY_PORT"
set_variable DEPLOY_PATH "$DEPLOY_PATH"
set_variable APP_PORT "${APP_PORT:-3010}"
set_variable POSTGRES_USER "${POSTGRES_USER:-edupassport}"
set_variable POSTGRES_DB "${POSTGRES_DB:-edupassport}"
set_variable NEXT_PUBLIC_SITE_NAME "${NEXT_PUBLIC_SITE_NAME:-EDU Passport}"
set_variable SMTP_PORT "${SMTP_PORT:-587}"
set_variable SMTP_SECURE "${SMTP_SECURE:-false}"
set_variable SMTP_FROM "${SMTP_FROM:-noreply@edupassport.me}"
set_variable NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
set_variable OPENAI_MODEL "${OPENAI_MODEL:-gpt-4o-mini}"
set_variable LOG_LEVEL "${LOG_LEVEL:-info}"

echo "[INFO] Done. Secret values were not printed."
