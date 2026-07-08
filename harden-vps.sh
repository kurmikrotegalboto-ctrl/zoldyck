#!/bin/bash
# ============================================
# HARDENING VPS - Keamanan Server
# Jalankan SEKALI setelah VPS baru
# ============================================

set -e

echo "=========================================="
echo "  VPS SECURITY HARDENING"
echo "  Monev KPI Dashboard"
echo "=========================================="
echo ""

# Cek root
if [ "$EUID" -ne 0 ]; then
  echo "Jalankan sebagai root: sudo bash harden-vps.sh"
  exit 1
fi

echo "[1/8] Update system..."
apt-get update -qq && apt-get upgrade -y -qq
echo "  Done"

echo ""
echo "[2/8] Install firewall (UFW)..."
apt-get install -y -qq ufw
echo "  Done"

echo ""
echo "[3/8] Configure firewall..."
# Reset dulu
ufw --force reset

# Default: blok semua incoming, izinkan semua outgoing
ufw default deny incoming
ufw default allow outgoing

# Izinkan SSH (penting! jangan kunci diri sendiri)
ufw allow ssh
# Izinkan HTTP dan HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Aktifkan
ufw --force enable
echo "  Port terbuka: 22 (SSH), 80 (HTTP), 443 (HTTPS)"
echo "  Semua port lain: BLOKIR"

echo ""
echo "[4/8] Install fail2ban (anti brute force SSH)..."
apt-get install -y -qq fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Config khusus SSH
cat > /etc/fail2ban/jail.local << 'F2BCONF'
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
F2BCONF

systemctl restart fail2ban
echo "  3x salah SSH = blokir 1 jam"

echo ""
echo "[5/8] Harden SSH config..."
# Backup original
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak

# Disable root login via SSH (gunakan user biasa)
sed -i 's/#PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config

# Disable password auth SSH (pakai SSH key saja)
sed -i 's/#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config

# Disable empty passwords
sed -i 's/#PermitEmptyPasswords.*/PermitEmptyPasswords no/' /etc/ssh/sshd_config

# Change default port (optional - uncomment jika mau)
# sed -i 's/#Port 22/Port 2222/' /etc/ssh/sshd_config

systemctl restart sshd
echo "  Root login SSH: DISABLED"
echo "  Password SSH: DISABLED (key only)"
echo "  Empty passwords: DISABLED"

echo ""
echo "[6/8] Disable unused services..."
# Cegah serangan via port yang tidak perlu
systemctl disable --now rpcbind 2>/dev/null || true
systemctl disable --now avahi-daemon 2>/dev/null || true
echo "  Service tidak perlu: DIMATIKAN"

echo ""
echo "[7/8] Install auto security updates..."
apt-get install -y -qq unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
echo "  Auto-update: AKTIF"

echo ""
echo "[8/8] Set timezone..."
timedatectl set-timezone Asia/Jakarta 2>/dev/null || true
echo "  Timezone: Asia/Jakarta"

echo ""
echo "=========================================="
echo "  VPS HARDENING SELESAI!"
echo "=========================================="
echo ""
echo "  Yang sudah diamankan:"
echo "    Firewall (UFW): Hanya port 22,80,443"
echo "    Fail2ban: Blokir IP brute force SSH"
echo "    SSH: Root login dimatikan"
echo "    SSH: Hanya key auth (bukan password)"
echo "    Auto-update: Aktif"
echo ""
echo "  PENTING: Buat SSH key di laptop dulu"
echo "    ssh-copy-id user@IP_VPS"
echo ""
echo "  Kalau sudah punya key, test:"
echo "    ssh user@IP_VPS"
echo "=========================================="