#!/bin/bash
# ============================================
# DEPLOY MONEV KPI - One Click Deploy
# Jalankan di VPS setelah upload file project
# ============================================

set -e

echo "=========================================="
echo "  DEPLOY MONEV KPI TEGALBOTO 2026"
echo "=========================================="
echo ""

# Cek domain
if [ -z "$1" ]; then
  echo "USAGE: ./deploy.sh domain.com"
  echo "Contoh: ./deploy.sh monev.kantorpegadaian.com"
  exit 1
fi

DOMAIN=$1

echo "[1/5] Cek prasyarat..."
for cmd in docker docker-compose; do
  if ! command -v $cmd &> /dev/null && ! command -v "docker compose" &> /dev/null; then
    echo "  ERROR: $cmd belum terinstall"
    echo "  Install: curl -fsSL https://get.docker.com | sh"
    exit 1
  fi
done
echo "  Docker OK"

echo ""
echo "[2/5] Setup domain: $DOMAIN"
export DOMAIN=$DOMAIN
echo "  Domain akan digunakan untuk SSL certificate"

echo ""
echo "[3/5] Build & Start container..."
docker compose down 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo ""
echo "[4/5] Tunggu SSL certificate..."
echo "  (Caddy otomatis request SSL dari Let's Encrypt)"
sleep 5

echo ""
echo "[5/5] Verifikasi..."
sleep 3

# Cek container
if docker compose ps | grep -q "running"; then
  echo "  Container: RUNNING"
else
  echo "  Container: ERROR - cek 'docker compose logs'"
  exit 1
fi

# Cek HTTP
if curl -sf -o /dev/null "http://localhost"; then
  echo "  HTTP: OK"
else
  echo "  HTTP: ERROR"
fi

echo ""
echo "=========================================="
echo "  DEPLOY BERHASIL!"
echo "=========================================="
echo ""
echo "  URL: https://$DOMAIN"
echo "  Password default: admin123"
echo "  SEGERA GANTI PASSWORD setelah login!"
echo ""
echo "  Commands:"
echo "    docker compose logs -f     # Lihat log"
echo "    docker compose restart     # Restart"
echo "    docker compose down        # Stop"
echo ""
echo "  Backup data:"
echo "    docker cp monev-kpi:/app/data/snapshots.json backup-$(date +%Y%m%d).json"
echo "=========================================="