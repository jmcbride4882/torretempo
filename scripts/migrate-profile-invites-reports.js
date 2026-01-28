const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "apps", "api", "data", "torre-tempo.sqlite");

const db = new Database(DB_PATH);

db.exec(`
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  selfie_path TEXT,
  selfie_uploaded_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  location TEXT,
  department TEXT,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS monthly_signatures (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,
  signed_at TEXT NOT NULL,
  signature_path TEXT NOT NULL,
  signature_hash TEXT,
  signer_name TEXT,
  ip_address TEXT,
  user_agent TEXT
);

CREATE TABLE IF NOT EXISTS availability_rules (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_off (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  approved_by TEXT,
  approved_at TEXT,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS rota_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rota_template_shifts (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  role TEXT,
  notes TEXT,
  assigned_user_id TEXT,
  location TEXT,
  department TEXT
);
`);

console.log("Migration complete.");
