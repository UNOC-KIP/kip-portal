#!/usr/bin/env bash
# Nightly Postgres backup -> S3. Installed on the EC2 host and run from cron.
# See DEPLOYMENT.md Phase 6.
#
# Dumps to a temp file and verifies the gzip BEFORE uploading, so a mid-stream
# pg_dump failure can never publish a truncated/empty object (the streaming
# `pg_dump | gzip | aws s3 cp -` form silently uploads a corrupt file on error).
#
# PATH is set explicitly because cron runs with a bare PATH=/usr/bin:/bin, which
# omits /usr/local/bin/aws and breaks the upload — the original failure mode.
set -euo pipefail
export PATH="/usr/local/bin:/usr/bin:/bin"

BUCKET="${KIP_BACKUP_BUCKET:-kip-backups-unoc}"
COMPOSE="${KIP_COMPOSE:-/opt/kip/docker-compose.prod.yml}"
STAMP="$(date +%F_%H%M)"
KEY="pg/kip_portal_${STAMP}.sql.gz"
TMP="$(mktemp /tmp/kip_pg_XXXXXX.sql.gz)"
trap 'rm -f "$TMP"' EXIT

echo "[$(date -Is)] backup start -> s3://${BUCKET}/${KEY}"

docker compose -f "$COMPOSE" exec -T postgres \
  pg_dump -U kip kip_portal | gzip > "$TMP"

if [ ! -s "$TMP" ] || ! gzip -t "$TMP"; then
  echo "[$(date -Is)] ERROR: dump is empty or not a valid gzip - aborting, nothing uploaded" >&2
  exit 1
fi

aws s3 cp "$TMP" "s3://${BUCKET}/${KEY}"
echo "[$(date -Is)] backup OK ($(du -h "$TMP" | cut -f1)) -> s3://${BUCKET}/${KEY}"
