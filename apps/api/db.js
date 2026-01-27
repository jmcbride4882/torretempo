const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "torre-tempo.sqlite");
const DB_IMPORT_PATH =
  process.env.DB_IMPORT_PATH || path.join(__dirname, "data", "torre-tempo.sqlite.import");
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(DB_IMPORT_PATH)) {
  const backupPath = `${DB_PATH}.bak-${Date.now()}`;
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupPath);
  }
  fs.copyFileSync(DB_IMPORT_PATH, DB_PATH);
  fs.unlinkSync(DB_IMPORT_PATH);
}

const dbExists = fs.existsSync(DB_PATH);
const db = new Database(DB_PATH);

function initDb() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  if (!dbExists) {
    db.exec(schema);
    return;
  }
  if (process.env.DB_MIGRATIONS_ENABLED !== "true") {
    return;
  }
  db.exec(schema);
  ensureColumn("users", "is_active", "INTEGER NOT NULL DEFAULT 1");
  ensureColumn("users", "reset_token", "TEXT");
  ensureColumn("users", "reset_expires", "TEXT");
  ensureColumn("users", "archived_at", "TEXT");
  ensureColumn("users", "location", "TEXT");
  ensureColumn("users", "department", "TEXT");
  ensureTable("user_scopes", "user_id TEXT NOT NULL, location TEXT NOT NULL, department TEXT NOT NULL");
  ensureTable(
    "rota_reminders",
    "id TEXT PRIMARY KEY, shift_id TEXT, date TEXT NOT NULL, type TEXT NOT NULL, location TEXT NOT NULL, department TEXT NOT NULL, scheduled_for TEXT, sent_at TEXT NOT NULL"
  );
  ensureColumn("corrections", "resolved_by", "TEXT");
  ensureColumn("corrections", "resolution_note", "TEXT");
  ensureColumn("rota_weeks", "location", "TEXT");
  ensureColumn("rota_weeks", "department", "TEXT");
  ensureColumn("rota_shifts", "location", "TEXT");
  ensureColumn("rota_shifts", "department", "TEXT");
  ensureColumn("rota_reminders", "shift_id", "TEXT");
  ensureColumn("rota_reminders", "location", "TEXT");
  ensureColumn("rota_reminders", "department", "TEXT");
  ensureColumn("rota_reminders", "scheduled_for", "TEXT");
}

function ensureColumn(table, column, type) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = info.some((col) => col.name === column);
  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function ensureTable(table, columnsSql) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${table} (${columnsSql})`);
}

module.exports = {
  db,
  initDb
};
