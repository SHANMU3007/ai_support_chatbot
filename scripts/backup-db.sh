#!/usr/bin/env bash
# scripts/backup-db.sh – Dump PostgreSQL and compress to backups/
set -euo pipefail

BACKUP_DIR="$(dirname "$0")/../backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="chatbot_ai_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Backing up database to backups/${FILENAME} …"

docker-compose exec -T postgres \
  pg_dump -U postgres chatbot_ai \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "Backup complete: backups/${FILENAME}"

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
echo "Cleaned up backups older than 30 days."
