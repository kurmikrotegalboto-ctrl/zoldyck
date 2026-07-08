#!/bin/bash
# Backup data KPI dari container Docker
# Jalankan: ./backup.sh

BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="monev-kpi"

echo "Backup data dari $CONTAINER..."

# Backup snapshots
docker cp "$CONTAINER:/app/data/snapshots.json" "$BACKUP_DIR/snapshots_$DATE.json" 2>/dev/null && \
  echo "  snapshots_$DATE.json OK" || echo "  snapshots: kosong"

# Backup auth
docker cp "$CONTAINER:/app/data/auth.json" "$BACKUP_DIR/auth_$DATE.json" 2>/dev/null && \
  echo "  auth_$DATE.json OK"

# Hapus backup lama (keep 30 hari)
find "$BACKUP_DIR" -name "*.json" -mtime +30 -delete 2>/dev/null

echo "Backup selesai di $BACKUP_DIR/"