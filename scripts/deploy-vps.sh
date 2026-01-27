#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/opt/torre-tempo}"

if [ -z "$REPO_URL" ]; then
  echo "REPO_URL is required. Example: REPO_URL=https://github.com/org/torre-tempo.git"
  exit 1
fi

echo "Installing system dependencies..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl git docker.io docker-compose-plugin
sudo systemctl enable --now docker

if [ ! -d "$APP_DIR/.git" ]; then
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" pull
fi

if [ -f "$APP_DIR/scripts/self-update.sh" ]; then
  chmod +x "$APP_DIR/scripts/self-update.sh"
fi

if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" <<EOF
ADMIN_EMAIL=${ADMIN_EMAIL:-admin@torretempo.local}
ADMIN_PASSWORD=${ADMIN_PASSWORD:-change-me}
ADMIN_NAME=${ADMIN_NAME:-Admin}
AUTO_SEED_ADMIN=${AUTO_SEED_ADMIN:-false}
JWT_SECRET=${JWT_SECRET:-change-me-strong}
PORT=4000
DB_MIGRATIONS_ENABLED=${DB_MIGRATIONS_ENABLED:-false}
DB_IMPORT_PATH=${DB_IMPORT_PATH:-/data/torre-tempo.sqlite.import}
UPDATE_SCRIPT_PATH=${UPDATE_SCRIPT_PATH:-/repo/scripts/self-update.sh}
RESET_URL_BASE=${RESET_URL_BASE:-https://time.lsltgroup.es/reset.html}
SMTP_HOST=${SMTP_HOST:-smtp.example.com}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_SECURE=${SMTP_SECURE:-false}
SMTP_USER=${SMTP_USER:-your-user}
SMTP_PASS=${SMTP_PASS:-your-pass}
SMTP_FROM=${SMTP_FROM:-torre-tempo@example.com}
CERT_P12_PATH=${CERT_P12_PATH:-/data/certs/company.p12}
CERT_P12_PASSWORD=${CERT_P12_PASSWORD:-change-me}
CERT_STORAGE_DIR=${CERT_STORAGE_DIR:-/data/certs}
EOF
  echo "Created .env file at $APP_DIR/.env"
fi

echo "Starting services..."
cd "$APP_DIR"
sudo docker compose up -d --build

echo "Done. Open http://<server-ip>:8080"
