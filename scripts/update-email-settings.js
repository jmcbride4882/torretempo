const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

const Database = require("better-sqlite3");
const defaultSettings = require("../apps/api/default-settings");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "torre-tempo.sqlite");
if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);
const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();
const settings = row ? JSON.parse(row.data) : defaultSettings;

settings.email = {
  reset_url_base: process.env.RESET_URL_BASE || "",
  smtp_host: process.env.SMTP_HOST || "",
  smtp_port: Number(process.env.SMTP_PORT || 587),
  smtp_secure: process.env.SMTP_SECURE === "true",
  smtp_user: process.env.SMTP_USER || "",
  smtp_pass: process.env.SMTP_PASS || "",
  smtp_from: process.env.SMTP_FROM || ""
};

if (row) {
  db.prepare("UPDATE settings SET data = ? WHERE id = 1").run(JSON.stringify(settings));
} else {
  db.prepare("INSERT INTO settings (id, data) VALUES (1, ?)").run(JSON.stringify(settings));
}

console.log("Email settings updated in settings table.");
