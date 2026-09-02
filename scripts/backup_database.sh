#!/usr/bin/env bash
# ==============================================================================
# Theatre Anti-Piracy Platform — PostgreSQL Backup Automation Script (Linux/Mac)
# ==============================================================================

set -euo pipefail

DB_NAME="${POSTGRES_DB:-theatre_antipiracy_db}"
DB_USER="${POSTGRES_USER:-postgres}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_backup_${TIMESTAMP}.dump"

echo "📦 Starting PostgreSQL backup for ${DB_NAME}..."

pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F c -b -v -f "$BACKUP_FILE"

echo "✅ Backup successfully generated: ${BACKUP_FILE}"

# Cleanup old backups older than retention window
find "$BACKUP_DIR" -type f -name "${DB_NAME}_backup_*.dump" -mtime +"$RETENTION_DAYS" -exec rm {} \;
echo "🧹 Old backups cleaned up (Retention: ${RETENTION_DAYS} days)."
