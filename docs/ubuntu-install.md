# Fresh Ubuntu Install Guide

This guide installs Torre Tempo on a fresh Ubuntu server and configures HTTPS for `time.lsltgroup.es`.

## 1) Prepare the server
```bash
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl git ufw
```

Enable firewall:
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

## 2) Install Docker
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
```

Install Docker Compose plugin:
```bash
sudo apt-get install -y docker-compose-plugin
```

## 3) Clone the repository
```bash
git clone https://github.com/jmcbride4882/torretempo.git /opt/torre-tempo
cd /opt/torre-tempo
```

## 4) Configure environment
Copy `.env.example` to `.env` and update:

```bash
cp .env.example .env
nano .env
```

Required values:
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `JWT_SECRET`
- `RESET_URL_BASE=https://time.lsltgroup.es/reset.html`
- SMTP settings
- Certificate settings (optional; can upload in Admin UI)

Recommended:
- `DB_MIGRATIONS_ENABLED=false` to avoid schema changes on updates
- `AUTO_SEED_ADMIN=false` to force setup UI on first install

## 5) Start services
```bash
chmod +x scripts/self-update.sh
docker compose up -d --build
```

The app is available on `http://<server-ip>:8080`.

## 6) HTTPS with Caddy
Install Caddy:
```bash
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt-get update -y
sudo apt-get install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```text
time.lsltgroup.es {
  reverse_proxy 127.0.0.1:8080
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

## 7) Admin setup
1) Visit `/setup.html` and complete the setup.
2) Configure Email and Reset settings.
3) Upload the certificate in Exports and Audit.
4) Configure Rota reminders.
5) Define staff scopes (location/department pairs).

## 8) Backups
The database is stored in `./data/torre-tempo.sqlite`.
Back up the `data` directory regularly.

## 9) Updates
Use Admin > System updates or run:
```bash
cd /opt/torre-tempo
git pull --rebase
docker compose up -d --build
```

Enable updates in Admin > System updates and set an update token.

## Migration
If you are upgrading an existing database, run:
```bash
cd /opt/torre-tempo
docker compose exec api node /repo/scripts/migrate-scopes.js
```
