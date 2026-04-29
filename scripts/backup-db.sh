#!/usr/bin/env bash
set -euo pipefail

# Database backup script for EDU Passport
# Usage: ./scripts/backup-db.sh [backup_dir]
#
# Environment variables:
#   DATABASE_URL - PostgreSQL connection string (required)
#   BACKUP_RETENTION_DAYS - Days to keep backups (default: 30)
#
# Cron example (daily at 2am):
#   0 2 * * * /path/to/scripts/backup-db.sh /path/to/backups >> /var/log/edupassport-backup.log 2>&1

BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="edupassport_${TIMESTAMP}.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL is not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup..."

# Extract connection parts from DATABASE_URL
# Format: postgresql://user:pass@host:port/dbname
pg_dump "$DATABASE_URL" --no-owner --no-privileges --clean --if-exists | gzip > "$BACKUP_DIR/$FILENAME"

FILESIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date -Iseconds)] Backup complete: $FILENAME ($FILESIZE)"

# Cleanup old backups
if [ "$RETENTION_DAYS" -gt 0 ]; then
  DELETED=$(find "$BACKUP_DIR" -name "edupassport_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
  if [ "$DELETED" -gt 0 ]; then
    echo "[$(date -Iseconds)] Cleaned up $DELETED old backup(s)"
  fi
fi

echo "[$(date -Iseconds)] Done."
