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
`);

console.log("Migration complete.");
