# Production Docker Deployment

This folder is used by `.github/workflows/deploy.yml`.

## Server Prerequisites

- Linux server with Docker Engine installed.
- Docker Compose v2 available as `docker compose`.
- SSH user that can run Docker commands.
- Inbound access to `APP_PORT` (default `3000`) from your reverse proxy or firewall.

The workflow deploys into `DEPLOY_PATH` (default `/opt/edupassport.me`) and creates:

- `docker-compose.prod.yml`
- `remote-deploy.sh`
- `.env`
- Docker volume `edupassport_postgres-data`

## Required GitHub Secrets

```text
DEPLOY_HOST
DEPLOY_USER
DEPLOY_SSH_KEY
POSTGRES_PASSWORD
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_SITE_URL
ADMIN_PASSWORD
CRON_SECRET
```

The workflow uses the built-in GitHub Actions token to push and pull the GHCR image during deployment, so no long-lived GHCR PAT is required.

## Optional GitHub Variables or Secrets

```text
DEPLOY_PORT=22
DEPLOY_PATH=/opt/edupassport.me
APP_PORT=3000
POSTGRES_USER=edupassport
POSTGRES_DB=edupassport
NEXT_PUBLIC_SITE_NAME=EDU Passport
SMTP_*
STRIPE_*
OPENAI_*
UDEMY_API_KEY
USAJOBS_API_KEY
USAJOBS_USER_AGENT
TICKETMASTER_API_KEY
AWIN_ACCESS_TOKEN
AWIN_PUBLISHER_ID
```

For this server, the checked local defaults are:

```text
DEPLOY_HOST=209.54.106.114
DEPLOY_USER=root
DEPLOY_PORT=22
DEPLOY_PATH=/opt/edupassport.me
APP_PORT=3010
DEPLOY_SSH_KEY_PATH=$HOME/.ssh/aipan_prod_root
```

Use `scripts/bootstrap-github-secrets.sh` to write the required GitHub Secrets
and Variables from `deploy/.env.production` and the SSH key file. The script
prints only key names, never secret values.

## Deploy Flow

1. `CI` succeeds on `main`.
2. `Deploy Production` builds and pushes `ghcr.io/unilei/edupassportme:sha-<commit>`.
3. The workflow uploads the compose file, deploy script, and generated env file to the server.
4. The server logs in to GHCR, pulls the image, starts PostgreSQL, runs Prisma migrations, updates the app, and verifies `/api/health`.

## Data Sync

`.github/workflows/sync.yml` calls `/api/cron/sync` every 4 hours using
`NEXT_PUBLIC_SITE_URL` and `CRON_SECRET`. Providers without credentials are
skipped by the app and shown in the admin sync dashboard.
