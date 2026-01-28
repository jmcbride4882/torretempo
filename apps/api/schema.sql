CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL,
  location TEXT,
  department TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  reset_token TEXT,
  reset_expires TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_scopes (
  user_id TEXT NOT NULL,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  PRIMARY KEY (user_id, location, department)
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS time_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS breaks (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  start TEXT NOT NULL,
  end TEXT
);

CREATE TABLE IF NOT EXISTS geo_events (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  accuracy REAL,
  device_id TEXT
);

CREATE TABLE IF NOT EXISTS corrections (
  id TEXT PRIMARY KEY,
  entry_id TEXT,
  user_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT,
  resolution_note TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  meta TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rota_weeks (
  week_start TEXT NOT NULL,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  published_by TEXT,
  PRIMARY KEY (week_start, location, department)
);

CREATE TABLE IF NOT EXISTS rota_shifts (
  id TEXT PRIMARY KEY,
  week_start TEXT NOT NULL,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  role TEXT,
  notes TEXT,
  assigned_user_id TEXT,
  created_by TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS rota_reminders (
  id TEXT PRIMARY KEY,
  shift_id TEXT,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  department TEXT NOT NULL,
  scheduled_for TEXT,
  sent_at TEXT NOT NULL
);

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
