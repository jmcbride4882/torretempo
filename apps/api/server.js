require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { execFile } = require("child_process");
const SignPdf = require("node-signpdf").default;
const { plainAddPlaceholder } = require("node-signpdf/dist/helpers");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const { db, initDb } = require("./db");
const defaultSettings = require("./default-settings");

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change";
const CERT_P12_PATH = process.env.CERT_P12_PATH || "";
const CERT_P12_PASSWORD = process.env.CERT_P12_PASSWORD || "";
const CERT_STORAGE_DIR = process.env.CERT_STORAGE_DIR || "/data/certs";
const SELFIE_STORAGE_DIR = process.env.SELFIE_STORAGE_DIR || "/data/selfies";
const SIGNATURE_STORAGE_DIR = process.env.SIGNATURE_STORAGE_DIR || "/data/signatures";
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "torre-tempo.sqlite");
const DB_IMPORT_PATH = process.env.DB_IMPORT_PATH || path.join(__dirname, "data", "torre-tempo.sqlite.import");
const DB_IMPORT_DIR = path.dirname(DB_IMPORT_PATH);

if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(SELFIE_STORAGE_DIR)) {
  fs.mkdirSync(SELFIE_STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(SIGNATURE_STORAGE_DIR)) {
  fs.mkdirSync(SIGNATURE_STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(DB_IMPORT_DIR)) {
  fs.mkdirSync(DB_IMPORT_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, CERT_STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".p12";
    cb(null, `cert-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

const selfieStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, SELFIE_STORAGE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".png";
    cb(null, `selfie-${req.user ? req.user.id : "anon"}-${Date.now()}${ext}`);
  }
});

const selfieUpload = multer({
  storage: selfieStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Invalid file type"));
    }
    return cb(null, true);
  }
});

const dbUpload = multer({
  dest: DB_IMPORT_DIR,
  limits: { fileSize: 100 * 1024 * 1024 }
});

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "5mb" }));

initDb();
seedSettings();
seedAdmin();

function seedSettings() {
  const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();
  if (!row) {
    db.prepare("INSERT INTO settings (id, data) VALUES (1, ?)").run(JSON.stringify(defaultSettings));
  }
}

function seedAdmin() {
  if (process.env.AUTO_SEED_ADMIN !== "true") {
    return;
  }
  const existing = db.prepare("SELECT id FROM users LIMIT 1").get();
  if (existing) return;
  const email = process.env.ADMIN_EMAIL || "admin@torretempo.local";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Admin";
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(nanoid(), email, hash, name, "admin", 1, new Date().toISOString());
  logAudit(null, "seed_admin", "user", null, { email });
}

function logAudit(userId, action, entityType, entityId, meta) {
  db.prepare(
    "INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, meta, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(nanoid(), userId, action, entityType, entityId, JSON.stringify(meta || {}), new Date().toISOString());
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db
      .prepare("SELECT id, email, role, is_active, location, department FROM users WHERE id = ?")
      .get(decoded.id);
    if (!user || user.is_active === 0) return res.status(401).json({ error: "User inactive" });
    const scopes = getUserScopes(user.id);
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      location: user.location || "default",
      department: user.department || "general",
      scopes
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}

function getUserScopes(userId) {
  return db.prepare("SELECT location, department FROM user_scopes WHERE user_id = ?").all(userId);
}

function setUserScopes(userId, scopes) {
  db.prepare("DELETE FROM user_scopes WHERE user_id = ?").run(userId);
  const stmt = db.prepare("INSERT INTO user_scopes (user_id, location, department) VALUES (?, ?, ?)");
  scopes.forEach((scope) => {
    stmt.run(userId, scope.location, scope.department);
  });
}

function normalizeScopes(body) {
  const scopes = [];
  if (Array.isArray(body.scopes)) {
    body.scopes.forEach((scope) => {
      if (!scope) return;
      const location = String(scope.location || "").trim();
      const department = String(scope.department || "").trim();
      if (location && department) scopes.push({ location, department });
    });
  }
  const locations = Array.isArray(body.locations)
    ? body.locations.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const departments = Array.isArray(body.departments)
    ? body.departments.map((item) => String(item).trim()).filter(Boolean)
    : [];
  if (locations.length && departments.length) {
    locations.forEach((location) => {
      departments.forEach((department) => {
        scopes.push({ location, department });
      });
    });
  }
  if (!scopes.length && body.location && body.department) {
    scopes.push({ location: String(body.location).trim(), department: String(body.department).trim() });
  }
  const seen = new Set();
  return scopes.filter((scope) => {
    const key = `${scope.location}::${scope.department}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getUserScopesMap(userIds) {
  if (!userIds.length) return {};
  const placeholders = userIds.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT user_id, location, department FROM user_scopes WHERE user_id IN (${placeholders})`)
    .all(...userIds);
  return rows.reduce((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push({ location: row.location, department: row.department });
    return acc;
  }, {});
}

function stageDatabaseImport(tempPath) {
  const backupPath = `${DB_PATH}.bak-${Date.now()}`;
  if (fs.existsSync(DB_PATH)) {
    fs.copyFileSync(DB_PATH, backupPath);
  }
  fs.copyFileSync(tempPath, DB_IMPORT_PATH);
  fs.unlinkSync(tempPath);
}

function attachScopesToUsers(users) {
  const ids = users.map((user) => user.id);
  const map = getUserScopesMap(ids);
  return users.map((user) => ({ ...user, scopes: map[user.id] || [] }));
}

function getManagerScopedUserIds(req) {
  if (req.user.role !== "manager") return [];
  const users = db
    .prepare("SELECT id, email, name, role, is_active, location, department FROM users WHERE is_active = 1 ORDER BY name ASC")
    .all();
  const managerScopes = req.user.scopes && req.user.scopes.length
    ? req.user.scopes
    : [{ location: req.user.location, department: req.user.department }];
  const scoped = attachScopesToUsers(users).filter((user) =>
    user.scopes.some((scope) =>
      managerScopes.some(
        (managerScope) =>
          scope.location === managerScope.location && scope.department === managerScope.department
      )
    )
  );
  return scoped.map((user) => user.id);
}

const PROFILE_FIELDS = [
  "full_name",
  "preferred_name",
  "phone",
  "address",
  "postal_code",
  "city",
  "province",
  "country",
  "birth_date",
  "tax_id",
  "social_security_number",
  "employee_id",
  "job_title",
  "start_date",
  "emergency_contact_name",
  "emergency_contact_phone",
  "iban"
];

function parseProfilePayload(body) {
  const payload = body && typeof body === "object" ? body : {};
  const data = {};
  PROFILE_FIELDS.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      data[key] = String(payload[key] || "").trim();
    }
  });
  return data;
}

function getUserProfile(userId) {
  try {
    const row = db
      .prepare("SELECT data, selfie_path, selfie_uploaded_at, updated_at FROM user_profiles WHERE user_id = ?")
      .get(userId);
    if (!row) {
      return { data: {}, selfie_path: "", selfie_uploaded_at: null, updated_at: null };
    }
    let data = {};
    try {
      data = row.data ? JSON.parse(row.data) : {};
    } catch (err) {
      data = {};
    }
    return {
      data,
      selfie_path: row.selfie_path,
      selfie_uploaded_at: row.selfie_uploaded_at,
      updated_at: row.updated_at
    };
  } catch (err) {
    return { data: {}, selfie_path: "", selfie_uploaded_at: null, updated_at: null };
  }
}

function upsertUserProfile(userId, data, extra) {
  try {
    const existing = db.prepare("SELECT data, selfie_path, selfie_uploaded_at FROM user_profiles WHERE user_id = ?").get(userId);
    const now = new Date().toISOString();
    const extraData = extra || {};
    if (existing) {
      let current = {};
      try {
        current = existing.data ? JSON.parse(existing.data) : {};
      } catch (err) {
        current = {};
      }
      const merged = { ...current, ...data };
      db.prepare(
        "UPDATE user_profiles SET data = ?, selfie_path = ?, selfie_uploaded_at = ?, updated_at = ? WHERE user_id = ?"
      ).run(
        JSON.stringify(merged),
        extraData.selfie_path !== undefined ? extraData.selfie_path : existing.selfie_path,
        extraData.selfie_uploaded_at !== undefined ? extraData.selfie_uploaded_at : existing.selfie_uploaded_at,
        now,
        userId
      );
      return { data: merged };
    }
    db.prepare(
      "INSERT INTO user_profiles (user_id, data, selfie_path, selfie_uploaded_at, updated_at) VALUES (?, ?, ?, ?, ?)"
    ).run(
      userId,
      JSON.stringify(data || {}),
      extraData.selfie_path || "",
      extraData.selfie_uploaded_at || null,
      now
    );
    return { data: data || {} };
  } catch (err) {
    throw new Error("Profile table missing. Run migration.");
  }
}

function normalizeMonth(month) {
  if (!month || typeof month !== "string") return null;
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  return month;
}

function getMonthlySignature(userId, month) {
  try {
    return db
      .prepare("SELECT * FROM monthly_signatures WHERE user_id = ? AND month = ? ORDER BY signed_at DESC LIMIT 1")
      .get(userId, month);
  } catch (err) {
    return null;
  }
}

function getMonthlyEntries(userId, month) {
  const [year, mon] = month.split("-").map(Number);
  return db
    .prepare("SELECT * FROM time_entries WHERE user_id = ? AND strftime('%Y', start) = ? AND strftime('%m', start) = ? ORDER BY start ASC")
    .all(userId, String(year), String(mon).padStart(2, "0"));
}

function buildMonthlyReport(userId, month) {
  const entries = getMonthlyEntries(userId, month);
  const daySet = new Set();
  let totalMinutes = 0;
  let breakMinutes = 0;
  const detailed = entries.map((entry) => {
    const breaks = db.prepare("SELECT * FROM breaks WHERE entry_id = ?").all(entry.id);
    const entryBreakMinutes = breaks.reduce((acc, brk) => {
      if (!brk.end) return acc;
      return acc + (new Date(brk.end) - new Date(brk.start)) / 60000;
    }, 0);
    const minutes = getWorkMinutes(entry);
    totalMinutes += minutes;
    breakMinutes += entryBreakMinutes;
    daySet.add(entry.start.split("T")[0]);
    return {
      ...entry,
      break_minutes: Math.round(entryBreakMinutes),
      work_minutes: minutes
    };
  });
  return {
    month,
    entries: detailed,
    totals: {
      total_minutes: totalMinutes,
      total_hours: Math.round((totalMinutes / 60) * 100) / 100,
      break_minutes: Math.round(breakMinutes),
      days: daySet.size
    }
  };
}

function getPublicBaseUrl(req) {
  const settings = getSettings();
  const base = settings.system && settings.system.public_base_url ? settings.system.public_base_url : "";
  if (base) return base.replace(/\/+$/, "");
  const reset = (settings.email && settings.email.reset_url_base) || process.env.RESET_URL_BASE || "";
  if (reset) {
    return reset.replace(/\/reset\.html.*$/i, "").replace(/\/+$/, "");
  }
  const proto = (req && (req.headers["x-forwarded-proto"] || req.protocol)) || "https";
  const host = req && (req.headers["x-forwarded-host"] || req.headers.host);
  return host ? `${proto}://${host}` : "";
}

function writeSignatureFile(dataUrl, userId, month) {
  if (!dataUrl || typeof dataUrl !== "string") {
    throw new Error("Signature data missing");
  }
  const match = dataUrl.match(/^data:(image\/png|image\/jpeg);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid signature format");
  }
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const ext = mime === "image/jpeg" ? ".jpg" : ".png";
  const filename = `signature-${userId}-${month}-${Date.now()}${ext}`;
  const filePath = path.join(SIGNATURE_STORAGE_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return { filePath, hash };
}

function getSettings() {
  const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();
  const stored = row ? JSON.parse(row.data) : defaultSettings;
  return mergeSettings(defaultSettings, stored);
}

function setSettings(data) {
  db.prepare("UPDATE settings SET data = ? WHERE id = 1").run(JSON.stringify(data));
}

function sanitizeSettings(settings, role) {
  if (role === "admin") return settings;
  const clone = JSON.parse(JSON.stringify(settings));
  if (clone.email) {
    clone.email.smtp_user = "";
    clone.email.smtp_pass = "";
  }
  if (clone.exports) {
    clone.exports.cert_path = "";
    clone.exports.cert_password = "";
  }
  if (clone.system) {
    clone.system.update_token = "";
  }
  return clone;
}

function mergeSettings(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? override : base;
  }
  const result = { ...base };
  if (override && typeof override === "object") {
    Object.keys(override).forEach((key) => {
      if (base[key] && typeof base[key] === "object" && !Array.isArray(base[key])) {
        result[key] = mergeSettings(base[key], override[key]);
      } else if (override[key] !== undefined) {
        result[key] = override[key];
      }
    });
  }
  return result;
}

function getMissingFields(settings) {
  const missing = [];
  const required = [
    ["company.controller_legal_name", "Company legal name"],
    ["company.controller_cif", "Company CIF"],
    ["company.controller_address", "Company address"],
    ["company.controller_contact_email", "Company contact email"],
    ["company.controller_contact_phone", "Company contact phone"],
    ["representatives.recording_method_version", "Recording method version"],
    ["representatives.recording_method_effective_date", "Recording method effective date"],
    ["time.payroll_provider_name", "Payroll provider"],
    ["geo.geo_notice_version", "Geolocation notice version"],
    ["privacy.privacy_notice_version", "Privacy notice version"],
    ["privacy.byod_policy_version", "BYOD policy version"],
    ["privacy.disconnection_policy_version", "Disconnection policy version"],
    ["privacy.record_of_processing_version", "Record of processing version"],
    ["hosting.hosting_provider", "Hosting provider"],
    ["hosting.data_processing_agreement_ref", "DPA reference"],
    ["exports.audit_log_retention_years", "Audit log retention years"],
    ["privacy.data_retention_years", "Data retention years"],
    ["geo.geo_retention_years", "Geolocation retention years"]
  ];

  if (settings.company.has_dpo) {
    required.push(["company.dpo_name", "DPO name"]);
    required.push(["company.dpo_email", "DPO email"]);
  }

  if (settings.representatives.has_worker_reps) {
    required.push(["representatives.reps_consultation_record", "Consultation record"]);
  } else {
    required.push(["representatives.no_reps_statement", "No reps statement"]);
  }

  required.forEach(([path, label]) => {
    const value = getPath(settings, path);
    if (value === null || value === undefined || value === "" || Number.isNaN(value)) {
      missing.push(label);
    }
  });

  if (settings.privacy.data_retention_years < 4) missing.push("Data retention must be >= 4");
  if (settings.geo.geo_retention_years < 4) missing.push("Geo retention must be >= 4");
  if (settings.exports.audit_log_retention_years < 4) missing.push("Audit retention must be >= 4");

  return missing;
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function mapEntryWithBreaks(entry) {
  const breaks = db.prepare("SELECT * FROM breaks WHERE entry_id = ? ORDER BY start ASC").all(entry.id);
  return { ...entry, breaks };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  if (user.is_active === 0) return res.status(403).json({ error: "User inactive" });
  const valid = bcrypt.compareSync(password || "", user.password_hash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, JWT_SECRET, {
    expiresIn: "12h"
  });
  logAudit(user.id, "login", "user", user.id, {});
  const scopes = getUserScopes(user.id);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location || "",
      department: user.department || "",
      scopes
    }
  });
});

app.post("/api/auth/request-reset", (req, res) => {
  const { email } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || user.is_active === 0) {
    return res.json({ ok: true });
  }
  const mailConfig = getEmailConfig();
  if (!mailConfig.host || !mailConfig.from) {
    return res.status(500).json({ error: "SMTP not configured" });
  }
  const token = nanoid(24);
  const expires = new Date(Date.now() + 1000 * 60 * 30).toISOString();
  db.prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?").run(
    token,
    expires,
    user.id
  );
  logAudit(user.id, "password_reset_requested", "user", user.id, {});
  sendResetEmail(user.email, token, mailConfig).then(
    () => res.json({ ok: true }),
    () => res.status(500).json({ error: "Failed to send email" })
  );
});

app.post("/api/auth/reset-password", (req, res) => {
  const { token, new_password } = req.body || {};
  if (!token || !new_password) return res.status(400).json({ error: "Missing fields" });
  const user = db.prepare("SELECT * FROM users WHERE reset_token = ?").get(token);
  if (!user) return res.status(400).json({ error: "Invalid token" });
  if (user.is_active === 0) return res.status(403).json({ error: "User inactive" });
  if (user.reset_expires && new Date(user.reset_expires) < new Date()) {
    return res.status(400).json({ error: "Token expired" });
  }
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?").run(
    hash,
    user.id
  );
  logAudit(user.id, "password_reset", "user", user.id, {});
  res.json({ ok: true });
});

app.post("/api/auth/change-password", requireAuth, (req, res) => {
  const { current_password, new_password } = req.body || {};
  if (!current_password || !new_password) return res.status(400).json({ error: "Missing fields" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const valid = bcrypt.compareSync(current_password, user.password_hash);
  if (!valid) return res.status(400).json({ error: "Invalid current password" });
  const hash = bcrypt.hashSync(new_password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  logAudit(req.user.id, "password_changed", "user", user.id, {});
  res.json({ ok: true });
});

app.get("/api/settings", requireAuth, (req, res) => {
  res.json(sanitizeSettings(getSettings(), req.user.role));
});

app.get("/api/profile", requireAuth, (req, res) => {
  const user = db
    .prepare("SELECT id, email, name, role, location, department, created_at FROM users WHERE id = ?")
    .get(req.user.id);
  const profile = getUserProfile(req.user.id);
  res.json({
    ...user,
    scopes: req.user.scopes || [],
    profile: profile.data,
    selfie_uploaded_at: profile.selfie_uploaded_at,
    profile_updated_at: profile.updated_at
  });
});

app.put("/api/profile", requireAuth, (req, res) => {
  const payload = req.body && req.body.profile ? req.body.profile : req.body;
  const profileData = parseProfilePayload(payload);
  const displayName = profileData.full_name || profileData.preferred_name || "";
  try {
    if (displayName) {
      db.prepare("UPDATE users SET name = ? WHERE id = ?").run(displayName, req.user.id);
    }
    upsertUserProfile(req.user.id, profileData, {});
    logAudit(req.user.id, "profile_updated", "user_profile", req.user.id, {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/profile/selfie", requireAuth, (req, res) => {
  selfieUpload.single("selfie")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No selfie provided" });
    const uploadedAt = new Date().toISOString();
    try {
      upsertUserProfile(req.user.id, {}, { selfie_path: req.file.path, selfie_uploaded_at: uploadedAt });
      logAudit(req.user.id, "selfie_uploaded", "user_profile", req.user.id, { file: req.file.filename });
      res.json({ ok: true, selfie_uploaded_at: uploadedAt });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
});

app.get("/api/profile/selfie", requireAuth, (req, res) => {
  const profile = getUserProfile(req.user.id);
  if (!profile.selfie_path || !fs.existsSync(profile.selfie_path)) {
    return res.status(404).json({ error: "Selfie not found" });
  }
  return res.sendFile(profile.selfie_path);
});

app.get("/api/setup/status", (req, res) => {
  const settings = getSettings();
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
  res.json({
    needs_setup: !settings.system.setup_complete && users.count === 0,
    has_users: users.count > 0
  });
});

app.post("/api/setup/complete", (req, res) => {
  const settings = getSettings();
  const users = db.prepare("SELECT COUNT(*) as count FROM users").get();
  if (settings.system.setup_complete) {
    return res.status(400).json({ error: "Setup already completed" });
  }
  if (users.count > 0) {
    return res.status(400).json({ error: "Users already exist" });
  }
  const admin = req.body.admin || {};
  if (!admin.email || !admin.password) {
    return res.status(400).json({ error: "Admin email and password required" });
  }
  const hash = bcrypt.hashSync(admin.password, 10);
  const adminUser = {
    id: nanoid(),
    email: admin.email,
    password_hash: hash,
    name: admin.name || "Admin",
    role: "admin",
    is_active: 1,
    archived_at: null,
    location: admin.location || "default",
    department: admin.department || "general",
    created_at: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, is_active, archived_at, location, department, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    adminUser.id,
    adminUser.email,
    adminUser.password_hash,
    adminUser.name,
    adminUser.role,
    adminUser.is_active,
    adminUser.archived_at,
    adminUser.location,
    adminUser.department,
    adminUser.created_at
  );
  setUserScopes(adminUser.id, [{ location: adminUser.location, department: adminUser.department }]);

  const updated = mergeSettings(settings, req.body.settings || {});
  updated.company = { ...updated.company, ...(req.body.company || {}) };
  updated.representatives = {
    ...updated.representatives,
    has_worker_reps: false,
    no_reps_statement: updated.representatives.no_reps_statement || "No worker representatives",
    recording_method_version: updated.representatives.recording_method_version || "setup-v1",
    recording_method_effective_date:
      updated.representatives.recording_method_effective_date || new Date().toISOString().split("T")[0]
  };
  updated.system.setup_complete = true;
  updated.system.setup_completed_at = new Date().toISOString();
  setSettings(updated);
  logAudit(adminUser.id, "setup_completed", "system", "setup", {});
  res.json({ ok: true });
});

app.post("/api/setup/import", dbUpload.single("database"), (req, res) => {
  const settings = getSettings();
  if (settings.system.setup_complete) {
    return res.status(400).json({ error: "Setup already completed" });
  }
  if (!req.file) return res.status(400).json({ error: "No database file provided" });
  stageDatabaseImport(req.file.path);
  res.json({ ok: true, restart_required: true });
});

app.get("/api/invites/validate", (req, res) => {
  const token = (req.query.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    const invite = db.prepare("SELECT * FROM invites WHERE token = ?").get(token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.revoked_at) return res.status(400).json({ error: "Invite revoked" });
    if (invite.used_at) return res.status(400).json({ error: "Invite already used" });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: "Invite expired" });
    }
    res.json({
      email: invite.email || "",
      role: invite.role,
      location: invite.location || "",
      department: invite.department || "",
      expires_at: invite.expires_at
    });
  } catch (err) {
    res.status(500).json({ error: "Invites unavailable. Run migration." });
  }
});

app.post("/api/signup", (req, res) => {
  const token = (req.body.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token required" });
  try {
    const invite = db.prepare("SELECT * FROM invites WHERE token = ?").get(token);
    if (!invite) return res.status(404).json({ error: "Invite not found" });
    if (invite.revoked_at) return res.status(400).json({ error: "Invite revoked" });
    if (invite.used_at) return res.status(400).json({ error: "Invite already used" });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: "Invite expired" });
    }
    const email = (invite.email || req.body.email || "").trim();
    const password = req.body.password || "";
    if (!email) return res.status(400).json({ error: "Email required" });
    if (!password || password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (exists) return res.status(400).json({ error: "Email already registered" });
    const profileData = parseProfilePayload(req.body.profile || req.body);
    const name = profileData.full_name || profileData.preferred_name || "";
    const primary = {
      location: invite.location || "default",
      department: invite.department || "general"
    };
    const hash = bcrypt.hashSync(password, 10);
    const user = {
      id: nanoid(),
      email,
      password_hash: hash,
      name,
      role: invite.role,
      is_active: 1,
      archived_at: null,
      location: primary.location,
      department: primary.department,
      created_at: new Date().toISOString()
    };
    db.prepare(
      "INSERT INTO users (id, email, password_hash, name, role, is_active, archived_at, location, department, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      user.id,
      user.email,
      user.password_hash,
      user.name,
      user.role,
      user.is_active,
      user.archived_at,
      user.location,
      user.department,
      user.created_at
    );
    if (invite.location && invite.department) {
      setUserScopes(user.id, [{ location: invite.location, department: invite.department }]);
    }
    upsertUserProfile(user.id, profileData, {});
    db.prepare("UPDATE invites SET used_at = ? WHERE id = ?").run(new Date().toISOString(), invite.id);
    logAudit(user.id, "signup_completed", "user", user.id, { email: user.email });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/invites", requireAuth, requireRole(["admin"]), (req, res) => {
  try {
    const invites = db.prepare("SELECT * FROM invites ORDER BY created_at DESC").all();
    const now = new Date();
    const baseUrl = getPublicBaseUrl(req);
    const rows = invites.map((invite) => {
      let status = "pending";
      if (invite.revoked_at) status = "revoked";
      else if (invite.used_at) status = "used";
      else if (invite.expires_at && new Date(invite.expires_at) < now) status = "expired";
      return {
        ...invite,
        status,
        link: baseUrl ? `${baseUrl}/signup.html?token=${invite.token}` : ""
      };
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Invites unavailable. Run migration." });
  }
});

app.post("/api/invites", requireAuth, requireRole(["admin"]), async (req, res) => {
  const role = (req.body.role || "employee").trim();
  const email = req.body.email ? String(req.body.email).trim() : "";
  const location = req.body.location ? String(req.body.location).trim() : "";
  const department = req.body.department ? String(req.body.department).trim() : "";
  const expiresInDays = Math.max(1, Number(req.body.expires_in_days || 14));
  if (!["admin", "manager", "employee"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }
  if (role !== "admin" && (!location || !department)) {
    return res.status(400).json({ error: "Location and department required" });
  }
  const invite = {
    id: nanoid(),
    token: nanoid(32),
    email: email || null,
    role,
    location: location || null,
    department: department || null,
    expires_at: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString(),
    created_by: req.user.id,
    created_at: new Date().toISOString(),
    used_at: null,
    revoked_at: null
  };
  try {
    db.prepare(
      "INSERT INTO invites (id, token, email, role, location, department, expires_at, created_by, created_at, used_at, revoked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      invite.id,
      invite.token,
      invite.email,
      invite.role,
      invite.location,
      invite.department,
      invite.expires_at,
      invite.created_by,
      invite.created_at,
      invite.used_at,
      invite.revoked_at
    );
    const baseUrl = getPublicBaseUrl(req);
    const link = baseUrl ? `${baseUrl}/signup.html?token=${invite.token}` : "";
    const mailConfig = getEmailConfig();
    if (email && mailConfig.host && mailConfig.from && link) {
      try {
        await sendMail(email, "Your Torre Tempo signup link", `Use this link to sign up: ${link}`, mailConfig);
      } catch (err) {
        // ignore email errors
      }
    }
    logAudit(req.user.id, "invite_created", "invite", invite.id, { email, role });
    res.json({ ok: true, link });
  } catch (err) {
    res.status(500).json({ error: "Invites unavailable. Run migration." });
  }
});

app.post("/api/invites/:id/revoke", requireAuth, requireRole(["admin"]), (req, res) => {
  try {
    const invite = db.prepare("SELECT * FROM invites WHERE id = ?").get(req.params.id);
    if (!invite) return res.status(404).json({ error: "Not found" });
    if (invite.revoked_at) return res.json({ ok: true });
    db.prepare("UPDATE invites SET revoked_at = ? WHERE id = ?").run(new Date().toISOString(), invite.id);
    logAudit(req.user.id, "invite_revoked", "invite", invite.id, {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Invites unavailable. Run migration." });
  }
});

app.put("/api/settings", requireAuth, requireRole(["admin"]), (req, res) => {
  const existing = getSettings();
  const merged = mergeSettings(existing, req.body);
  if (req.body.email) {
    if (req.body.email.smtp_pass === "") merged.email.smtp_pass = existing.email.smtp_pass || "";
    if (req.body.email.smtp_user === "") merged.email.smtp_user = existing.email.smtp_user || "";
  }
  if (req.body.exports) {
    if (req.body.exports.cert_password === "") merged.exports.cert_password = existing.exports.cert_password || "";
    if (!req.body.exports.cert_path) merged.exports.cert_path = existing.exports.cert_path || "";
    if (!req.body.exports.cert_original_name)
      merged.exports.cert_original_name = existing.exports.cert_original_name || "";
    if (!req.body.exports.cert_uploaded_at)
      merged.exports.cert_uploaded_at = existing.exports.cert_uploaded_at || "";
  }
  if (req.body.system) {
    if (req.body.system.update_token === "") {
      merged.system.update_token = existing.system.update_token || "";
    }
  }
  setSettings(merged);
  logAudit(req.user.id, "settings_update", "settings", "1", {});
  res.json({ ok: true });
});

app.get("/api/admin/db/export", requireAuth, requireRole(["admin"]), (req, res) => {
  if (!fs.existsSync(DB_PATH)) return res.status(404).json({ error: "Database not found" });
  const name = `torre-tempo-${new Date().toISOString().split("T")[0]}.sqlite`;
  res.download(DB_PATH, name);
});

app.post("/api/admin/db/import", requireAuth, requireRole(["admin"]), dbUpload.single("database"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No database file provided" });
  stageDatabaseImport(req.file.path);
  res.json({ ok: true, restart_required: true });
});

app.post(
  "/api/admin/certificate",
  requireAuth,
  requireRole(["admin"]),
  upload.single("certificate"),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No certificate provided" });
    const settings = getSettings();
    settings.exports = settings.exports || {};
    settings.exports.cert_path = req.file.path;
    settings.exports.cert_original_name = req.file.originalname;
    settings.exports.cert_uploaded_at = new Date().toISOString();
    if (req.body && Object.prototype.hasOwnProperty.call(req.body, "cert_password")) {
      settings.exports.cert_password = req.body.cert_password || "";
    }
    setSettings(settings);
    logAudit(req.user.id, "certificate_uploaded", "settings", "1", {
      file: req.file.originalname
    });
    res.json({
      ok: true,
      cert_original_name: settings.exports.cert_original_name,
      cert_uploaded_at: settings.exports.cert_uploaded_at
    });
  }
);

app.post("/api/admin/update", requireAuth, requireRole(["admin"]), (req, res) => {
  const settings = getSettings();
  if (!settings.system || !settings.system.updates_enabled) {
    return res.status(403).json({ error: "Updates are disabled" });
  }
  if (settings.system.update_token && req.body.token !== settings.system.update_token) {
    return res.status(403).json({ error: "Invalid update token" });
  }
  const scriptPath = settings.system.update_script_path || process.env.UPDATE_SCRIPT_PATH || "";
  if (!scriptPath || !fs.existsSync(scriptPath)) {
    return res.status(500).json({ error: "Update script not found" });
  }
  runUpdateScript(scriptPath, (err, output, details) => {
    if (err) {
      return res.status(500).json({ error: "Update failed", details: details || err.message });
    }
    return res.json({ ok: true, message: "Update started", output });
  });
});

app.get("/api/compliance", requireAuth, (req, res) => {
  const settings = getSettings();
  const missing = getMissingFields(settings);
  res.json({ ready: missing.length === 0, missing });
});

app.get("/api/staff", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  let users;
  if (req.user.role === "manager") {
    users = db
      .prepare(
        "SELECT id, email, name, role, is_active, location, department FROM users WHERE is_active = 1 ORDER BY name ASC"
      )
      .all();
    const managerScopes = req.user.scopes && req.user.scopes.length
      ? req.user.scopes
      : [{ location: req.user.location, department: req.user.department }];
    const scoped = attachScopesToUsers(users).filter((user) =>
      user.scopes.some((scope) =>
        managerScopes.some(
          (managerScope) =>
            scope.location === managerScope.location && scope.department === managerScope.department
        )
      )
    );
    return res.json(scoped);
  } else {
    users = db
      .prepare("SELECT id, email, name, role, is_active, location, department FROM users WHERE is_active = 1 ORDER BY name ASC")
      .all();
  }
  res.json(attachScopesToUsers(users));
});

app.get("/api/availability", requireAuth, (req, res) => {
  try {
    const userIdsParam = req.query.user_ids ? String(req.query.user_ids).split(",").filter(Boolean) : [];
    if (req.user.role === "employee") {
      const rows = db
        .prepare("SELECT * FROM availability_rules WHERE user_id = ? ORDER BY day_of_week, start_time")
        .all(req.user.id);
      return res.json(rows);
    }
    let allowedUserIds = userIdsParam;
    if (req.user.role === "manager") {
      const managerUserIds = getManagerScopedUserIds(req);
      allowedUserIds = (userIdsParam.length ? userIdsParam : managerUserIds).filter((id) => managerUserIds.includes(id));
      if (allowedUserIds.length === 0) {
        return res.json([]);
      }
    }
    if (allowedUserIds.length === 0) {
      const rows = db.prepare("SELECT * FROM availability_rules ORDER BY user_id, day_of_week, start_time").all();
      return res.json(rows);
    }
    const placeholders = allowedUserIds.map(() => "?").join(",");
    const rows = db
      .prepare(`SELECT * FROM availability_rules WHERE user_id IN (${placeholders}) ORDER BY user_id, day_of_week, start_time`)
      .all(...allowedUserIds);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Availability unavailable. Run migration." });
  }
});

app.post("/api/availability", requireAuth, (req, res) => {
  const userId = req.body.user_id || req.user.id;
  if (req.user.role === "employee" && userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === "manager") {
    const managerUserIds = getManagerScopedUserIds(req);
    if (!managerUserIds.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  const dayOfWeek = Number(req.body.day_of_week);
  const startTime = req.body.start_time;
  const endTime = req.body.end_time;
  const isAvailable = req.body.is_available === undefined ? 1 : req.body.is_available ? 1 : 0;
  if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return res.status(400).json({ error: "Invalid day" });
  }
  if (!startTime || !endTime) {
    return res.status(400).json({ error: "Start and end times required" });
  }
  const now = new Date().toISOString();
  const rule = {
    id: nanoid(),
    user_id: userId,
    day_of_week: dayOfWeek,
    start_time: startTime,
    end_time: endTime,
    is_available: isAvailable,
    created_at: now,
    updated_at: now
  };
  try {
    db.prepare(
      "INSERT INTO availability_rules (id, user_id, day_of_week, start_time, end_time, is_available, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      rule.id,
      rule.user_id,
      rule.day_of_week,
      rule.start_time,
      rule.end_time,
      rule.is_available,
      rule.created_at,
      rule.updated_at
    );
    logAudit(req.user.id, "availability_added", "availability_rule", rule.id, { user_id: userId });
    return res.json(rule);
  } catch (err) {
    return res.status(500).json({ error: "Availability unavailable. Run migration." });
  }
});

app.delete("/api/availability/:id", requireAuth, (req, res) => {
  let rule;
  try {
    rule = db.prepare("SELECT * FROM availability_rules WHERE id = ?").get(req.params.id);
  } catch (err) {
    return res.status(500).json({ error: "Availability unavailable. Run migration." });
  }
  if (!rule) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "employee" && rule.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === "manager") {
    const managerUserIds = getManagerScopedUserIds(req);
    if (!managerUserIds.includes(rule.user_id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  db.prepare("DELETE FROM availability_rules WHERE id = ?").run(req.params.id);
  logAudit(req.user.id, "availability_removed", "availability_rule", req.params.id, { user_id: rule.user_id });
  res.json({ ok: true });
});

app.get("/api/time-off", requireAuth, (req, res) => {
  try {
    const from = req.query.from ? String(req.query.from) : "";
    const to = req.query.to ? String(req.query.to) : "";
    const userIdsParam = req.query.user_ids ? String(req.query.user_ids).split(",").filter(Boolean) : [];
    if (req.user.role === "employee") {
      let sql = "SELECT * FROM time_off WHERE user_id = ?";
      const params = [req.user.id];
      if (from) {
        sql += " AND end_date >= ?";
        params.push(from);
      }
      if (to) {
        sql += " AND start_date <= ?";
        params.push(to);
      }
      sql += " ORDER BY start_date DESC";
      const rows = db.prepare(sql).all(...params);
      return res.json(rows);
    }
    let allowedUserIds = userIdsParam;
    if (req.user.role === "manager") {
      const managerUserIds = getManagerScopedUserIds(req);
      allowedUserIds = (userIdsParam.length ? userIdsParam : managerUserIds).filter((id) => managerUserIds.includes(id));
      if (allowedUserIds.length === 0) {
        return res.json([]);
      }
    }
    const params = [];
    let sql = "SELECT * FROM time_off WHERE 1 = 1";
    if (allowedUserIds.length) {
      const placeholders = allowedUserIds.map(() => "?").join(",");
      sql += ` AND user_id IN (${placeholders})`;
      params.push(...allowedUserIds);
    }
    if (from) {
      sql += " AND end_date >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND start_date <= ?";
      params.push(to);
    }
    sql += " ORDER BY start_date DESC";
    const rows = db.prepare(sql).all(...params);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: "Time off unavailable. Run migration." });
  }
});

app.post("/api/time-off", requireAuth, (req, res) => {
  const userId = req.body.user_id || req.user.id;
  if (req.user.role === "employee" && userId !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  if (req.user.role === "manager") {
    const managerUserIds = getManagerScopedUserIds(req);
    if (!managerUserIds.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  const startDate = req.body.start_date;
  const endDate = req.body.end_date;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Start and end dates required" });
  }
  const now = new Date().toISOString();
  const status = req.user.role === "employee" ? "pending" : req.body.status || "approved";
  const record = {
    id: nanoid(),
    user_id: userId,
    start_date: startDate,
    end_date: endDate,
    reason: req.body.reason || "",
    status,
    created_by: req.user.id,
    created_at: now,
    approved_by: status === "approved" ? req.user.id : null,
    approved_at: status === "approved" ? now : null,
    notes: req.body.notes || ""
  };
  try {
    db.prepare(
      "INSERT INTO time_off (id, user_id, start_date, end_date, reason, status, created_by, created_at, approved_by, approved_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      record.id,
      record.user_id,
      record.start_date,
      record.end_date,
      record.reason,
      record.status,
      record.created_by,
      record.created_at,
      record.approved_by,
      record.approved_at,
      record.notes
    );
    logAudit(req.user.id, "time_off_created", "time_off", record.id, { user_id: userId, status });
    return res.json(record);
  } catch (err) {
    return res.status(500).json({ error: "Time off unavailable. Run migration." });
  }
});

app.patch("/api/time-off/:id", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  let record;
  try {
    record = db.prepare("SELECT * FROM time_off WHERE id = ?").get(req.params.id);
  } catch (err) {
    return res.status(500).json({ error: "Time off unavailable. Run migration." });
  }
  if (!record) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "manager") {
    const managerUserIds = getManagerScopedUserIds(req);
    if (!managerUserIds.includes(record.user_id)) {
      return res.status(403).json({ error: "Forbidden" });
    }
  }
  const status = req.body.status || record.status;
  const notes = req.body.notes !== undefined ? req.body.notes : record.notes;
  const approved = status === "approved" ? new Date().toISOString() : record.approved_at;
  const approvedBy = status === "approved" ? req.user.id : record.approved_by;
  db.prepare("UPDATE time_off SET status = ?, notes = ?, approved_at = ?, approved_by = ? WHERE id = ?").run(
    status,
    notes,
    approved,
    approvedBy,
    record.id
  );
  logAudit(req.user.id, "time_off_updated", "time_off", record.id, { status });
  res.json({ ok: true });
});

app.get("/api/rota/weeks", requireAuth, (req, res) => {
  const start = req.query.start;
  if (!start) return res.status(400).json({ error: "start is required" });
  const scope = resolveScope(req, req.query);
  const week = db
    .prepare("SELECT * FROM rota_weeks WHERE week_start = ? AND location = ? AND department = ?")
    .get(start, scope.location, scope.department);
  const result = week || { week_start: start, is_published: 0, published_at: null, published_by: null };
  if (req.user.role === "employee" && result.is_published === 0) {
    return res.json({ week_start: start, is_published: 0, published_at: null, published_by: null });
  }
  res.json({ ...result, location: scope.location, department: scope.department });
});

app.post("/api/rota/weeks/:start/publish", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  const weekStart = req.params.start;
  const scope = resolveScope(req, req.body);
  const now = new Date().toISOString();
  const existing = db
    .prepare("SELECT week_start FROM rota_weeks WHERE week_start = ? AND location = ? AND department = ?")
    .get(weekStart, scope.location, scope.department);
  if (existing) {
    db.prepare(
      "UPDATE rota_weeks SET is_published = 1, published_at = ?, published_by = ? WHERE week_start = ? AND location = ? AND department = ?"
    ).run(now, req.user.id, weekStart, scope.location, scope.department);
  } else {
    db.prepare(
      "INSERT INTO rota_weeks (week_start, location, department, is_published, published_at, published_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(weekStart, scope.location, scope.department, 1, now, req.user.id);
  }
  logAudit(req.user.id, "rota_published", "rota_week", weekStart, scope);

  const notify = req.body && req.body.notify !== undefined ? Boolean(req.body.notify) : true;
  if (notify) {
    try {
      await sendRotaPublishNotifications(weekStart, scope);
    } catch (err) {
      return res.status(500).json({ error: "Failed to send notifications" });
    }
  }
  res.json({ ok: true });
});

app.post("/api/rota/weeks/:start/unpublish", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const weekStart = req.params.start;
  const scope = resolveScope(req, req.body);
  db.prepare("UPDATE rota_weeks SET is_published = 0 WHERE week_start = ? AND location = ? AND department = ?").run(
    weekStart,
    scope.location,
    scope.department
  );
  logAudit(req.user.id, "rota_unpublished", "rota_week", weekStart, scope);
  res.json({ ok: true });
});

app.post("/api/rota/weeks/:start/notify", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  const weekStart = req.params.start;
  const scope = resolveScope(req, req.body);
  try {
    await sendRotaPublishNotifications(weekStart, scope);
    logAudit(req.user.id, "rota_notify_sent", "rota_week", weekStart, scope);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/rota/templates", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const scope = resolveScope(req, req.query);
  try {
    const rows = db
      .prepare("SELECT * FROM rota_templates WHERE location = ? AND department = ? ORDER BY created_at DESC")
      .all(scope.location, scope.department);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Templates unavailable. Run migration." });
  }
});

app.get("/api/rota/templates/:id", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  try {
    const template = db.prepare("SELECT * FROM rota_templates WHERE id = ?").get(req.params.id);
    if (!template) return res.status(404).json({ error: "Not found" });
    const shifts = db
      .prepare("SELECT * FROM rota_template_shifts WHERE template_id = ? ORDER BY day_of_week, start_time")
      .all(template.id);
    res.json({ ...template, shifts });
  } catch (err) {
    res.status(500).json({ error: "Templates unavailable. Run migration." });
  }
});

app.post("/api/rota/templates", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const name = (req.body.name || "").trim();
  const scope = resolveScope(req, req.body);
  const shifts = Array.isArray(req.body.shifts) ? req.body.shifts : [];
  if (!name) return res.status(400).json({ error: "Name required" });
  const now = new Date().toISOString();
  const template = {
    id: nanoid(),
    name,
    location: scope.location,
    department: scope.department,
    created_by: req.user.id,
    created_at: now,
    updated_at: now
  };
  try {
    db.prepare(
      "INSERT INTO rota_templates (id, name, location, department, created_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      template.id,
      template.name,
      template.location,
      template.department,
      template.created_by,
      template.created_at,
      template.updated_at
    );
    const stmt = db.prepare(
      "INSERT INTO rota_template_shifts (id, template_id, day_of_week, start_time, end_time, role, notes, assigned_user_id, location, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    shifts.forEach((shift) => {
      const day = Number(shift.day_of_week);
      if (Number.isNaN(day)) return;
      stmt.run(
        nanoid(),
        template.id,
        day,
        shift.start_time,
        shift.end_time,
        shift.role || "",
        shift.notes || "",
        shift.assigned_user_id || null,
        shift.location || template.location,
        shift.department || template.department
      );
    });
    logAudit(req.user.id, "rota_template_created", "rota_template", template.id, { name });
    res.json(template);
  } catch (err) {
    res.status(500).json({ error: "Templates unavailable. Run migration." });
  }
});

app.delete("/api/rota/templates/:id", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  try {
    const template = db.prepare("SELECT * FROM rota_templates WHERE id = ?").get(req.params.id);
    if (!template) return res.status(404).json({ error: "Not found" });
    db.prepare("DELETE FROM rota_template_shifts WHERE template_id = ?").run(template.id);
    db.prepare("DELETE FROM rota_templates WHERE id = ?").run(template.id);
    logAudit(req.user.id, "rota_template_deleted", "rota_template", template.id, {});
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Templates unavailable. Run migration." });
  }
});

app.post("/api/rota/templates/:id/apply", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const weekStart = req.body.week_start;
  if (!weekStart) return res.status(400).json({ error: "week_start required" });
  const includeAssignments = Boolean(req.body.include_assignments);
  const overwrite = Boolean(req.body.overwrite);
  const scope = resolveScope(req, req.body);
  try {
    const template = db.prepare("SELECT * FROM rota_templates WHERE id = ?").get(req.params.id);
    if (!template) return res.status(404).json({ error: "Not found" });
    const shifts = db.prepare("SELECT * FROM rota_template_shifts WHERE template_id = ?").all(template.id);
    if (overwrite) {
      db.prepare("DELETE FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ?").run(
        weekStart,
        scope.location,
        scope.department
      );
    }
    const stmt = db.prepare(
      "INSERT INTO rota_shifts (id, week_start, location, department, date, start_time, end_time, role, notes, assigned_user_id, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    shifts.forEach((shift) => {
      const date = new Date(`${weekStart}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + Number(shift.day_of_week || 0));
      const shiftDate = date.toISOString().split("T")[0];
      stmt.run(
        nanoid(),
        weekStart,
        scope.location,
        scope.department,
        shiftDate,
        shift.start_time,
        shift.end_time,
        shift.role || "",
        shift.notes || "",
        includeAssignments ? shift.assigned_user_id : null,
        req.user.id,
        new Date().toISOString()
      );
    });
    logAudit(req.user.id, "rota_template_applied", "rota_template", template.id, { weekStart });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Templates unavailable. Run migration." });
  }
});

app.post("/api/rota/weeks/copy", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const fromWeek = req.body.from_week_start;
  const toWeek = req.body.to_week_start;
  if (!fromWeek || !toWeek) return res.status(400).json({ error: "from_week_start and to_week_start required" });
  const includeAssignments = Boolean(req.body.include_assignments);
  const overwrite = Boolean(req.body.overwrite);
  const repeatWeeks = Math.max(1, Number(req.body.repeat_weeks || 1));
  const scope = resolveScope(req, req.body);
  const sourceShifts = db
    .prepare("SELECT * FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ?")
    .all(fromWeek, scope.location, scope.department);
  const stmt = db.prepare(
    "INSERT INTO rota_shifts (id, week_start, location, department, date, start_time, end_time, role, notes, assigned_user_id, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (let weekIndex = 0; weekIndex < repeatWeeks; weekIndex += 1) {
    const baseDate = new Date(`${toWeek}T00:00:00Z`);
    baseDate.setUTCDate(baseDate.getUTCDate() + weekIndex * 7);
    const targetWeek = baseDate.toISOString().split("T")[0];
    if (overwrite) {
      db.prepare("DELETE FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ?").run(
        targetWeek,
        scope.location,
        scope.department
      );
    }
    sourceShifts.forEach((shift) => {
      const offset = dayDiff(fromWeek, shift.date);
      const newDate = new Date(`${targetWeek}T00:00:00Z`);
      newDate.setUTCDate(newDate.getUTCDate() + offset);
      const shiftDate = newDate.toISOString().split("T")[0];
      stmt.run(
        nanoid(),
        targetWeek,
        scope.location,
        scope.department,
        shiftDate,
        shift.start_time,
        shift.end_time,
        shift.role || "",
        shift.notes || "",
        includeAssignments ? shift.assigned_user_id : null,
        req.user.id,
        new Date().toISOString()
      );
    });
  }
  logAudit(req.user.id, "rota_week_copied", "rota_week", fromWeek, { toWeek, repeatWeeks });
  res.json({ ok: true });
});

app.get("/api/rota/shifts", requireAuth, (req, res) => {
  const weekStart = req.query.start;
  if (!weekStart) return res.status(400).json({ error: "start is required" });
  const scope = resolveScope(req, req.query);
  const week = db
    .prepare("SELECT * FROM rota_weeks WHERE week_start = ? AND location = ? AND department = ?")
    .get(weekStart, scope.location, scope.department);
  const published = week && week.is_published === 1;
  if (req.user.role === "employee" && !published) {
    return res.json([]);
  }
  if (req.user.role === "employee") {
    const shifts = db
      .prepare(
        "SELECT * FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ? AND assigned_user_id = ? ORDER BY date, start_time"
      )
      .all(weekStart, scope.location, scope.department, req.user.id);
    return res.json(shifts);
  }
  const shifts = db
    .prepare("SELECT * FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ? ORDER BY date, start_time")
    .all(weekStart, scope.location, scope.department);
  res.json(shifts);
});

app.post("/api/rota/shifts", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const { date, start_time, end_time, role, location, notes, assigned_user_id } = req.body || {};
  if (!date || !start_time || !end_time) return res.status(400).json({ error: "Missing fields" });
  const scope = resolveScope(req, req.body);
  const weekStart = req.body.week_start || getWeekStart(date);
  const shift = {
    id: nanoid(),
    week_start: weekStart,
    location: location || scope.location,
    department: scope.department,
    date,
    start_time,
    end_time,
    role: role || "",
    notes: notes || "",
    assigned_user_id: assigned_user_id || null,
    created_by: req.user.id,
    updated_at: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO rota_shifts (id, week_start, location, department, date, start_time, end_time, role, notes, assigned_user_id, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    shift.id,
    shift.week_start,
    shift.location,
    shift.department,
    shift.date,
    shift.start_time,
    shift.end_time,
    shift.role,
    shift.notes,
    shift.assigned_user_id,
    shift.created_by,
    shift.updated_at
  );
  logAudit(req.user.id, "rota_shift_created", "rota_shift", shift.id, {});
  res.json(shift);
});

app.patch("/api/rota/shifts/:id", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const shift = db.prepare("SELECT * FROM rota_shifts WHERE id = ?").get(req.params.id);
  if (!shift) return res.status(404).json({ error: "Not found" });
  const date = req.body.date || shift.date;
  const scope = resolveScope(req, req.body);
  const locationValue = req.user.role === "admin" && req.body.location !== undefined ? req.body.location : scope.location;
  const departmentValue = req.user.role === "admin" && req.body.department !== undefined ? req.body.department : scope.department;
  const updated = {
    week_start: getWeekStart(date),
    location: locationValue,
    department: departmentValue,
    date,
    start_time: req.body.start_time || shift.start_time,
    end_time: req.body.end_time || shift.end_time,
    role: req.body.role !== undefined ? req.body.role : shift.role,
    notes: req.body.notes !== undefined ? req.body.notes : shift.notes,
    assigned_user_id:
      req.body.assigned_user_id !== undefined ? req.body.assigned_user_id : shift.assigned_user_id,
    updated_at: new Date().toISOString()
  };
  db.prepare(
    "UPDATE rota_shifts SET week_start = ?, location = ?, department = ?, date = ?, start_time = ?, end_time = ?, role = ?, notes = ?, assigned_user_id = ?, updated_at = ? WHERE id = ?"
  ).run(
    updated.week_start,
    updated.location,
    updated.department,
    updated.date,
    updated.start_time,
    updated.end_time,
    updated.role,
    updated.notes,
    updated.assigned_user_id,
    updated.updated_at,
    shift.id
  );
  logAudit(req.user.id, "rota_shift_updated", "rota_shift", shift.id, {});
  res.json({ ...shift, ...updated });
});

app.delete("/api/rota/shifts/:id", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const shift = db.prepare("SELECT * FROM rota_shifts WHERE id = ?").get(req.params.id);
  if (!shift) return res.status(404).json({ error: "Not found" });
  db.prepare("DELETE FROM rota_shifts WHERE id = ?").run(shift.id);
  logAudit(req.user.id, "rota_shift_deleted", "rota_shift", shift.id, {});
  res.json({ ok: true });
});

app.post("/api/rota/shifts/:id/copy", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const shift = db.prepare("SELECT * FROM rota_shifts WHERE id = ?").get(req.params.id);
  if (!shift) return res.status(404).json({ error: "Not found" });
  const date = req.body.date || shift.date;
  const scope = resolveScope(req, req.body);
  const locationValue = req.user.role === "admin" && req.body.location ? req.body.location : scope.location;
  const departmentValue = req.user.role === "admin" && req.body.department ? req.body.department : scope.department;
  const copy = {
    id: nanoid(),
    week_start: getWeekStart(date),
    location: locationValue || shift.location,
    department: departmentValue,
    date,
    start_time: req.body.start_time || shift.start_time,
    end_time: req.body.end_time || shift.end_time,
    role: req.body.role || shift.role,
    notes: req.body.notes || shift.notes,
    assigned_user_id: req.body.assigned_user_id || shift.assigned_user_id,
    created_by: req.user.id,
    updated_at: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO rota_shifts (id, week_start, location, department, date, start_time, end_time, role, notes, assigned_user_id, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    copy.id,
    copy.week_start,
    copy.location,
    copy.department,
    copy.date,
    copy.start_time,
    copy.end_time,
    copy.role,
    copy.notes,
    copy.assigned_user_id,
    copy.created_by,
    copy.updated_at
  );
  logAudit(req.user.id, "rota_shift_copied", "rota_shift", copy.id, { from: shift.id });
  res.json(copy);
});

app.post("/api/rota/reminders", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  const type = req.body.type || "checkin";
  const date = req.body.date || new Date().toISOString().split("T")[0];
  const scope = resolveScope(req, req.body);
  try {
    await sendRotaReminderNotifications(date, type, scope);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

startRotaScheduler();
startAutoUpdateScheduler();

app.get("/api/time/entries", requireAuth, (req, res) => {
  const { user_id } = req.query;
  let entries;
  if (req.user.role === "admin" || req.user.role === "manager") {
    if (user_id) {
      entries = db.prepare("SELECT * FROM time_entries WHERE user_id = ? ORDER BY start DESC").all(user_id);
    } else {
      entries = db.prepare("SELECT * FROM time_entries ORDER BY start DESC").all();
    }
  } else {
    entries = db.prepare("SELECT * FROM time_entries WHERE user_id = ? ORDER BY start DESC").all(req.user.id);
  }
  res.json(entries.map(mapEntryWithBreaks));
});

app.post("/api/time/entries", requireAuth, (req, res) => {
  const settings = getSettings();
  const missing = getMissingFields(settings);
  if (missing.length > 0) {
    return res.status(400).json({ error: "Compliance settings incomplete" });
  }
  const open = db
    .prepare("SELECT id FROM time_entries WHERE user_id = ? AND end IS NULL")
    .get(req.user.id);
  if (open) return res.status(400).json({ error: "Shift already open" });
  const entry = {
    id: nanoid(),
    user_id: req.user.id,
    start: req.body.start || new Date().toISOString(),
    end: null,
    status: "open",
    created_at: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO time_entries (id, user_id, start, end, status, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(entry.id, entry.user_id, entry.start, entry.end, entry.status, entry.created_at);
  logAudit(req.user.id, "clock_in", "time_entry", entry.id, {});
  res.json(mapEntryWithBreaks(entry));
});

app.patch("/api/time/entries/:id", requireAuth, (req, res) => {
  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "employee" && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const end = req.body.end || new Date().toISOString();
  db.prepare("UPDATE time_entries SET end = ?, status = ? WHERE id = ?").run(end, "closed", entry.id);
  logAudit(req.user.id, "clock_out", "time_entry", entry.id, {});
  const updated = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(entry.id);
  res.json(mapEntryWithBreaks(updated));
});

app.post("/api/time/entries/:id/breaks", requireAuth, (req, res) => {
  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "employee" && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const active = db
    .prepare("SELECT id FROM breaks WHERE entry_id = ? AND end IS NULL")
    .get(entry.id);
  if (active) return res.status(400).json({ error: "Break already running" });
  const brk = {
    id: nanoid(),
    entry_id: entry.id,
    start: new Date().toISOString(),
    end: null
  };
  db.prepare("INSERT INTO breaks (id, entry_id, start, end) VALUES (?, ?, ?, ?)").run(
    brk.id,
    brk.entry_id,
    brk.start,
    brk.end
  );
  logAudit(req.user.id, "break_start", "break", brk.id, {});
  res.json(brk);
});

app.patch("/api/time/entries/:id/breaks/:breakId", requireAuth, (req, res) => {
  const brk = db.prepare("SELECT * FROM breaks WHERE id = ?").get(req.params.breakId);
  if (!brk) return res.status(404).json({ error: "Not found" });
  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(brk.entry_id);
  if (req.user.role === "employee" && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const end = new Date().toISOString();
  db.prepare("UPDATE breaks SET end = ? WHERE id = ?").run(end, brk.id);
  logAudit(req.user.id, "break_end", "break", brk.id, {});
  res.json({ ...brk, end });
});

app.post("/api/time/entries/:id/geo", requireAuth, (req, res) => {
  const entry = db.prepare("SELECT * FROM time_entries WHERE id = ?").get(req.params.id);
  if (!entry) return res.status(404).json({ error: "Not found" });
  if (req.user.role === "employee" && entry.user_id !== req.user.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const event = {
    id: nanoid(),
    entry_id: entry.id,
    user_id: entry.user_id,
    event_type: req.body.event_type,
    timestamp: req.body.timestamp || new Date().toISOString(),
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    accuracy: req.body.accuracy,
    device_id: req.body.device_id || null
  };
  db.prepare(
    "INSERT INTO geo_events (id, entry_id, user_id, event_type, timestamp, latitude, longitude, accuracy, device_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    event.id,
    event.entry_id,
    event.user_id,
    event.event_type,
    event.timestamp,
    event.latitude,
    event.longitude,
    event.accuracy,
    event.device_id
  );
  logAudit(req.user.id, "geo_capture", "geo_event", event.id, { event_type: event.event_type });
  res.json(event);
});

app.get("/api/geo/events", requireAuth, (req, res) => {
  const from = req.query.from ? String(req.query.from) : "";
  const to = req.query.to ? String(req.query.to) : "";
  const type = req.query.type ? String(req.query.type) : "";
  const requestedUser = req.query.user_id ? String(req.query.user_id) : "";
  const limit = Math.min(1000, Math.max(50, Number(req.query.limit || 300)));
  const params = [];
  let sql =
    "SELECT geo_events.*, users.name, users.email FROM geo_events LEFT JOIN users ON users.id = geo_events.user_id WHERE 1 = 1";
  if (req.user.role === "admin" || req.user.role === "manager") {
    if (requestedUser) {
      sql += " AND geo_events.user_id = ?";
      params.push(requestedUser);
    }
  } else {
    sql += " AND geo_events.user_id = ?";
    params.push(req.user.id);
  }
  if (from) {
    const fromValue = from.length === 10 ? `${from}T00:00:00` : from;
    sql += " AND geo_events.timestamp >= ?";
    params.push(fromValue);
  }
  if (to) {
    const toValue = to.length === 10 ? `${to}T23:59:59` : to;
    sql += " AND geo_events.timestamp <= ?";
    params.push(toValue);
  }
  if (type) {
    sql += " AND geo_events.event_type = ?";
    params.push(type);
  }
  sql += " ORDER BY geo_events.timestamp DESC LIMIT ?";
  params.push(limit);
  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

app.get("/api/corrections", requireAuth, (req, res) => {
  let rows;
  if (req.user.role === "admin" || req.user.role === "manager") {
    rows = db.prepare("SELECT * FROM corrections ORDER BY created_at DESC").all();
  } else {
    rows = db.prepare("SELECT * FROM corrections WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  }
  res.json(rows);
});

app.post("/api/corrections", requireAuth, (req, res) => {
  const correction = {
    id: nanoid(),
    entry_id: req.body.entry_id || null,
    user_id: req.user.id,
    reason: req.body.reason,
    status: "pending",
    created_at: new Date().toISOString(),
    resolved_at: null,
    resolved_by: null,
    resolution_note: null
  };
  db.prepare(
    "INSERT INTO corrections (id, entry_id, user_id, reason, status, created_at, resolved_at, resolved_by, resolution_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    correction.id,
    correction.entry_id,
    correction.user_id,
    correction.reason,
    correction.status,
    correction.created_at,
    correction.resolved_at,
    correction.resolved_by,
    correction.resolution_note
  );
  logAudit(req.user.id, "correction_requested", "correction", correction.id, {});
  res.json(correction);
});

app.patch("/api/corrections/:id", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const correction = db.prepare("SELECT * FROM corrections WHERE id = ?").get(req.params.id);
  if (!correction) return res.status(404).json({ error: "Not found" });
  const status = req.body.status || correction.status;
  if (!"approved,rejected".split(",").includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }
  const resolutionNote = req.body.resolution_note || null;
  const resolvedAt = new Date().toISOString();
  db.prepare(
    "UPDATE corrections SET status = ?, resolved_at = ?, resolved_by = ?, resolution_note = ? WHERE id = ?"
  ).run(status, resolvedAt, req.user.id, resolutionNote, correction.id);
  logAudit(req.user.id, "correction_update", "correction", correction.id, { status });
  res.json({ ...correction, status, resolved_at: resolvedAt, resolved_by: req.user.id, resolution_note: resolutionNote });
});

app.get("/api/reports/month", requireAuth, (req, res) => {
  if (!(req.user.role === "admin" || req.user.role === "manager")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const month = req.query.month;
  if (!month) return res.status(400).json({ error: "Month required" });
  const [year, mon] = month.split("-").map(Number);
  const entries = db
    .prepare("SELECT * FROM time_entries WHERE strftime('%Y', start) = ? AND strftime('%m', start) = ?")
    .all(String(year), String(mon).padStart(2, "0"));
  const totalMinutes = entries.reduce((acc, entry) => acc + getWorkMinutes(entry), 0);
  res.json({ entries: entries.length, totalMinutes });
});

app.get("/api/reports/monthly", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "Month required" });
  try {
    const users = db
      .prepare("SELECT id, email, name, role, location, department FROM users WHERE is_active = 1 ORDER BY name ASC")
      .all();
    const signatures = db.prepare("SELECT * FROM monthly_signatures WHERE month = ?").all(month);
    const signatureMap = signatures.reduce((acc, sig) => {
      if (!acc[sig.user_id]) acc[sig.user_id] = sig;
      return acc;
    }, {});
    const rows = users.map((user) => {
      const report = buildMonthlyReport(user.id, month);
      const signature = signatureMap[user.id];
      return {
        user_id: user.id,
        name: user.name || user.email,
        email: user.email,
        role: user.role,
        location: user.location || "",
        department: user.department || "",
        totals: report.totals,
        signed_at: signature ? signature.signed_at : null
      };
    });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Monthly reports unavailable. Run migration." });
  }
});

app.get("/api/reports/monthly/self", requireAuth, (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "Month required" });
  const report = buildMonthlyReport(req.user.id, month);
  const signature = getMonthlySignature(req.user.id, month);
  res.json({
    ...report,
    signed_at: signature ? signature.signed_at : null,
    signer_name: signature ? signature.signer_name : null
  });
});

app.post("/api/reports/monthly/sign", requireAuth, (req, res) => {
  const month = normalizeMonth(req.body.month);
  if (!month) return res.status(400).json({ error: "Month required" });
  try {
    const signatureData = req.body.signature;
    const signerName = req.body.signer_name ? String(req.body.signer_name).trim() : "";
    const { filePath, hash } = writeSignatureFile(signatureData, req.user.id, month);
    const now = new Date().toISOString();
    const existing = getMonthlySignature(req.user.id, month);
    if (existing) {
      db.prepare(
        "UPDATE monthly_signatures SET signed_at = ?, signature_path = ?, signature_hash = ?, signer_name = ?, ip_address = ?, user_agent = ? WHERE id = ?"
      ).run(now, filePath, hash, signerName || existing.signer_name || "", req.ip, req.headers["user-agent"] || "", existing.id);
    } else {
      db.prepare(
        "INSERT INTO monthly_signatures (id, user_id, month, signed_at, signature_path, signature_hash, signer_name, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        nanoid(),
        req.user.id,
        month,
        now,
        filePath,
        hash,
        signerName || "",
        req.ip,
        req.headers["user-agent"] || ""
      );
    }
    logAudit(req.user.id, "monthly_report_signed", "monthly_signature", req.user.id, { month });
    res.json({ ok: true, signed_at: now });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/reports/monthly/self/pdf", requireAuth, (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "Month required" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);
  const profile = getUserProfile(req.user.id);
  const signature = getMonthlySignature(req.user.id, month);
  const report = buildMonthlyReport(req.user.id, month);
  return renderMonthlyPdf(res, {
    month,
    user,
    profile: profile.data,
    signature,
    report,
    company: getSettings().company
  }).catch((err) => res.status(500).json({ error: `PDF render failed: ${err.message}` }));
});

app.get("/api/reports/monthly/:userId/pdf", requireAuth, requireRole(["admin", "manager"]), (req, res) => {
  const month = normalizeMonth(req.query.month);
  if (!month) return res.status(400).json({ error: "Month required" });
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const profile = getUserProfile(user.id);
  const signature = getMonthlySignature(user.id, month);
  const report = buildMonthlyReport(user.id, month);
  return renderMonthlyPdf(res, {
    month,
    user,
    profile: profile.data,
    signature,
    report,
    company: getSettings().company
  }).catch((err) => res.status(500).json({ error: `PDF render failed: ${err.message}` }));
});

app.get("/api/exports/:type", requireAuth, (req, res) => {
  if (!(req.user.role === "admin" || req.user.role === "manager")) {
    return res.status(403).json({ error: "Forbidden" });
  }
  const type = req.params.type;
  if (type === "time") {
    const rows = db.prepare("SELECT * FROM time_entries ORDER BY start DESC").all();
    return res.type("text/csv").send(toCsv(["date", "start", "end", "status"], rows.map((row) => [row.start.split("T")[0], row.start, row.end || "", row.status])));
  }
  if (type === "geo") {
    const rows = db.prepare("SELECT * FROM geo_events ORDER BY timestamp DESC").all();
    return res.type("text/csv").send(toCsv(["timestamp", "event_type", "lat", "lon", "accuracy"], rows.map((row) => [row.timestamp, row.event_type, row.latitude, row.longitude, row.accuracy])));
  }
  if (type === "audit") {
    const rows = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC").all();
    return res.type("text/csv").send(toCsv(["timestamp", "action", "entity_type"], rows.map((row) => [row.created_at, row.action, row.entity_type || ""])));
  }
  if (type === "pack") {
    const payload = {
      time_entries: db.prepare("SELECT * FROM time_entries").all(),
      breaks: db.prepare("SELECT * FROM breaks").all(),
      geo_events: db.prepare("SELECT * FROM geo_events").all(),
      audit_log: db.prepare("SELECT * FROM audit_log").all()
    };
    const format = req.query.format || "json";
    if (format === "pdf") {
      return renderPdfPack(res, payload).catch((err) => {
        return res.status(500).json({ error: `PDF render failed: ${err.message}` });
      });
    }
    return res.json(payload);
  }
  return res.status(400).json({ error: "Unknown export type" });
});

app.get("/api/audit", requireAuth, requireRole(["admin"]), (req, res) => {
  const rows = db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC").all();
  res.json(rows);
});

app.get("/api/users", requireAuth, requireRole(["admin"]), (req, res) => {
  const users = db
    .prepare(
      "SELECT id, email, name, role, is_active, archived_at, location, department, created_at FROM users ORDER BY created_at DESC"
    )
    .all();
  res.json(attachScopesToUsers(users));
});

app.post("/api/users", requireAuth, requireRole(["admin"]), (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !role) return res.status(400).json({ error: "Missing fields" });
  const scopes = normalizeScopes(req.body || {});
  if ((role === "manager" || role === "employee") && scopes.length === 0) {
    return res.status(400).json({ error: "Location and department required" });
  }
  const hash = bcrypt.hashSync(password, 10);
  const primary = scopes[0] || { location: req.body.location || "", department: req.body.department || "" };
  const user = {
    id: nanoid(),
    email,
    password_hash: hash,
    name: name || "",
    role,
    is_active: 1,
    archived_at: null,
    location: primary.location || "",
    department: primary.department || "",
    created_at: new Date().toISOString()
  };
  db.prepare(
    "INSERT INTO users (id, email, password_hash, name, role, is_active, archived_at, location, department, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    user.id,
    user.email,
    user.password_hash,
    user.name,
    user.role,
    user.is_active,
    user.archived_at,
    user.location,
    user.department,
    user.created_at
  );
  if (scopes.length) {
    setUserScopes(user.id, scopes);
  }
  logAudit(req.user.id, "user_created", "user", user.id, { email, role });
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.is_active,
    archived_at: user.archived_at,
    location: user.location,
    department: user.department,
    scopes,
    created_at: user.created_at
  });
});

app.patch("/api/users/:id", requireAuth, requireRole(["admin"]), (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const name = req.body.name !== undefined ? req.body.name : user.name;
  const role = req.body.role !== undefined ? req.body.role : user.role;
  const scopes = normalizeScopes(req.body || {});
  const primary = scopes[0] || {
    location: req.body.location !== undefined ? req.body.location : user.location,
    department: req.body.department !== undefined ? req.body.department : user.department
  };
  db.prepare("UPDATE users SET name = ?, role = ?, location = ?, department = ? WHERE id = ?").run(
    name,
    role,
    primary.location,
    primary.department,
    user.id
  );
  if (scopes.length) {
    setUserScopes(user.id, scopes);
  }
  if (req.body.password) {
    const hash = bcrypt.hashSync(req.body.password, 10);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  }
  logAudit(req.user.id, "user_updated", "user", user.id, { role });
  res.json({
    id: user.id,
    email: user.email,
    name,
    role,
    is_active: user.is_active,
    archived_at: user.archived_at,
    location: primary.location,
    department: primary.department,
    scopes
  });
});

app.post("/api/users/:id/deactivate", requireAuth, requireRole(["admin"]), (req, res) => {
  archiveUser(req, res);
});

app.post("/api/users/:id/activate", requireAuth, requireRole(["admin"]), (req, res) => {
  restoreUser(req, res);
});

app.post("/api/users/:id/archive", requireAuth, requireRole(["admin"]), (req, res) => {
  archiveUser(req, res);
});

app.post("/api/users/:id/restore", requireAuth, requireRole(["admin"]), (req, res) => {
  restoreUser(req, res);
});

app.post("/api/users/:id/reset-password", requireAuth, requireRole(["admin"]), (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const tempPassword = req.body.temp_password;
  if (!tempPassword) return res.status(400).json({ error: "Missing temp_password" });
  const hash = bcrypt.hashSync(tempPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  logAudit(req.user.id, "user_password_reset", "user", user.id, {});
  res.json({ ok: true });
});

function archiveUser(req, res) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const now = new Date().toISOString();
  db.prepare("UPDATE users SET is_active = 0, archived_at = ? WHERE id = ?").run(now, user.id);
  logAudit(req.user.id, "user_archived", "user", user.id, {});
  res.json({ ok: true });
}

function restoreUser(req, res) {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  db.prepare("UPDATE users SET is_active = 1, archived_at = NULL WHERE id = ?").run(user.id);
  logAudit(req.user.id, "user_restored", "user", user.id, {});
  res.json({ ok: true });
}

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

function getWorkMinutes(entry) {
  const end = entry.end ? new Date(entry.end) : new Date();
  const start = new Date(entry.start);
  const totalMinutes = Math.max(0, (end - start) / 60000);
  const breaks = db.prepare("SELECT * FROM breaks WHERE entry_id = ?").all(entry.id);
  const breakMinutes = breaks.reduce((acc, br) => {
    if (!br.end) return acc;
    return acc + (new Date(br.end) - new Date(br.start)) / 60000;
  }, 0);
  return Math.round(totalMinutes - breakMinutes);
}

function toCsv(headers, rows) {
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

async function renderPdfPack(res, payload) {
  const PDFDocument = require("pdfkit");
  const pdfBuffer = await buildPdfBuffer(payload, PDFDocument);
  const cert = getCertConfig();
  if (!cert.path || !fs.existsSync(cert.path)) {
    throw new Error("Certificate not configured. Upload a P12 in Admin > Exports and Audit.");
  }
  const p12Buffer = fs.readFileSync(cert.path);
  const placeholder = plainAddPlaceholder({
    pdfBuffer,
    reason: "Inspectorate export",
    signatureLength: 8192
  });
  const signer = new SignPdf();
  const signedPdf = signer.sign(placeholder, p12Buffer, { passphrase: cert.password || "" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=inspectorate-pack.pdf");
  res.send(signedPdf);
}

function buildPdfBuffer(payload, PDFDocument) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.fontSize(18).text("Inspectorate Pack", { align: "left" });
    doc.moveDown();
    doc.fontSize(12).text(`Generated: ${new Date().toISOString()}`);
    doc.text(`Time entries: ${payload.time_entries.length}`);
    doc.text(`Breaks: ${payload.breaks.length}`);
    doc.text(`Geo events: ${payload.geo_events.length}`);
    doc.text(`Audit entries: ${payload.audit_log.length}`);
    doc.moveDown();
    doc.text("Signed with company certificate.");
    doc.end();
  });
}

async function renderMonthlyPdf(res, payload) {
  const PDFDocument = require("pdfkit");
  const pdfBuffer = await buildMonthlyPdfBuffer(payload, PDFDocument);
  const safeMonth = payload.month || "report";
  const namePart = payload.user && payload.user.id ? payload.user.id : "user";
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=monthly-report-${safeMonth}-${namePart}.pdf`);
  res.send(pdfBuffer);
}

function buildMonthlyPdfBuffer(payload, PDFDocument) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const company = payload.company || {};
    const user = payload.user || {};
    const profile = payload.profile || {};
    const report = payload.report || { entries: [], totals: {} };
    const signature = payload.signature || null;

    const displayName = profile.full_name || user.name || user.email || "";

    doc.fontSize(18).text("Monthly Time Report", { align: "left" });
    doc.fontSize(10).text(`Generated: ${new Date().toISOString()}`);
    doc.moveDown();

    doc.fontSize(12).text("Company");
    doc.fontSize(10).text(company.controller_legal_name || "--");
    doc.text(`CIF: ${company.controller_cif || "--"}`);
    if (company.controller_address) doc.text(company.controller_address);
    doc.moveDown();

    doc.fontSize(12).text("Employee");
    doc.fontSize(10).text(`Name: ${displayName}`);
    doc.text(`Email: ${user.email || "--"}`);
    if (profile.employee_id) doc.text(`Employee ID: ${profile.employee_id}`);
    if (profile.tax_id) doc.text(`Tax ID: ${profile.tax_id}`);
    if (profile.social_security_number) doc.text(`Social Security: ${profile.social_security_number}`);
    if (profile.job_title) doc.text(`Job title: ${profile.job_title}`);
    doc.text(`Location / Department: ${(user.location || "--")} / ${(user.department || "--")}`);
    doc.moveDown();

    doc.fontSize(12).text(`Period: ${payload.month}`);
    doc.fontSize(10).text(`Days worked: ${report.totals.days || 0}`);
    doc.text(`Total hours: ${report.totals.total_hours || 0}`);
    doc.text(`Break minutes: ${report.totals.break_minutes || 0}`);
    doc.moveDown();

    doc.fontSize(12).text("Entries");
    doc.fontSize(9);
    if (!report.entries.length) {
      doc.text("No entries recorded.");
    } else {
      report.entries.forEach((entry) => {
        const date = entry.start ? entry.start.split("T")[0] : "--";
        const start = entry.start || "--";
        const end = entry.end || "--";
        const line = `${date} | ${start} - ${end} | Breaks: ${entry.break_minutes || 0} min | Worked: ${entry.work_minutes || 0} min`;
        doc.text(line);
      });
    }
    doc.moveDown();

    doc.fontSize(12).text("Employee signature");
    if (signature && signature.signature_path && fs.existsSync(signature.signature_path)) {
      doc.fontSize(10).text(`Signed at: ${signature.signed_at || "--"}`);
      try {
        doc.image(signature.signature_path, { fit: [220, 90] });
      } catch (err) {
        doc.text("Signature image unavailable.");
      }
    } else {
      doc.fontSize(10).text("Not signed");
    }

    doc.end();
  });
}

function getWeekStart(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().split("T")[0];
}

function dayDiff(fromDate, toDate) {
  const start = new Date(`${fromDate}T00:00:00Z`);
  const end = new Date(`${toDate}T00:00:00Z`);
  return Math.round((end - start) / (24 * 60 * 60 * 1000));
}

function resolveScope(req, source) {
  const scopes = req.user.scopes && req.user.scopes.length
    ? req.user.scopes
    : [{ location: req.user.location || "default", department: req.user.department || "general" }];
  const requested = {
    location: source && source.location ? String(source.location).trim() : "",
    department: source && source.department ? String(source.department).trim() : ""
  };
  if (req.user.role === "admin") {
    const location = requested.location || scopes[0].location || "default";
    const department = requested.department || scopes[0].department || "general";
    return { location, department };
  }
  if (requested.location && requested.department) {
    const allowed = scopes.some(
      (scope) => scope.location === requested.location && scope.department === requested.department
    );
    if (allowed) return requested;
  }
  return scopes[0];
}

async function sendRotaPublishNotifications(weekStart, scope) {
  const mailConfig = getEmailConfig();
  if (!mailConfig.host || !mailConfig.from) {
    throw new Error("SMTP not configured");
  }
  const shifts = db
    .prepare(
      "SELECT * FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ? AND assigned_user_id IS NOT NULL"
    )
    .all(weekStart, scope.location, scope.department);
  const users = db
    .prepare(
      "SELECT id, email, name FROM users WHERE id IN (SELECT DISTINCT assigned_user_id FROM rota_shifts WHERE week_start = ? AND location = ? AND department = ?)"
    )
    .all(weekStart, scope.location, scope.department);
  const shiftsByUser = shifts.reduce((acc, shift) => {
    if (!acc[shift.assigned_user_id]) acc[shift.assigned_user_id] = [];
    acc[shift.assigned_user_id].push(shift);
    return acc;
  }, {});
  for (const user of users) {
    const list = (shiftsByUser[user.id] || []).map((s) => `${s.date} ${s.start_time}-${s.end_time}`).join("\n");
    const text = `Your rota for week starting ${weekStart} has been published.\n\n${list || "No assigned shifts."}`;
    await sendMail(user.email, "Rota published", text, mailConfig);
  }
}

async function sendRotaReminderNotifications(date, type, scope) {
  const mailConfig = getEmailConfig();
  if (!mailConfig.host || !mailConfig.from) {
    throw new Error("SMTP not configured");
  }
  const shifts = db
    .prepare(
      "SELECT * FROM rota_shifts WHERE date = ? AND location = ? AND department = ? AND assigned_user_id IS NOT NULL"
    )
    .all(date, scope.location, scope.department);
  const users = db
    .prepare(
      "SELECT id, email, name FROM users WHERE id IN (SELECT DISTINCT assigned_user_id FROM rota_shifts WHERE date = ? AND location = ? AND department = ?)"
    )
    .all(date, scope.location, scope.department);
  const shiftsByUser = shifts.reduce((acc, shift) => {
    if (!acc[shift.assigned_user_id]) acc[shift.assigned_user_id] = [];
    acc[shift.assigned_user_id].push(shift);
    return acc;
  }, {});
  const subject = type === "checkout" ? "Clock out reminder" : "Clock in reminder";
  for (const user of users) {
    const list = (shiftsByUser[user.id] || []).map((s) => `${s.date} ${s.start_time}-${s.end_time}`).join("\n");
    const text = `Reminder to ${type === "checkout" ? "clock out" : "clock in"} for your shift on ${date}.\n\n${list}`;
    await sendMail(user.email, subject, text, mailConfig);
  }
}

async function sendMail(to, subject, text, mailConfig) {
  const transport = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.secure,
    auth: mailConfig.user ? { user: mailConfig.user, pass: mailConfig.pass } : undefined
  });
  await transport.sendMail({
    from: mailConfig.from,
    to,
    subject,
    text
  });
}

async function sendResetEmail(to, token, mailConfig) {
  const resetUrlBase = mailConfig.resetUrlBase;
  const resetUrl = resetUrlBase ? `${resetUrlBase}?token=${token}` : token;
  await sendMail(to, "Password reset", `Use this link to reset your password: ${resetUrl}`, mailConfig);
}

function getEmailConfig() {
  const settings = getSettings();
  const email = settings.email || {};
  return {
    resetUrlBase: email.reset_url_base || process.env.RESET_URL_BASE || "",
    host: email.smtp_host || process.env.SMTP_HOST || "",
    port: Number(email.smtp_port || process.env.SMTP_PORT || 587),
    secure: Boolean(email.smtp_secure ?? (process.env.SMTP_SECURE === "true")),
    user: email.smtp_user || process.env.SMTP_USER || "",
    pass: email.smtp_pass || process.env.SMTP_PASS || "",
    from: email.smtp_from || process.env.SMTP_FROM || ""
  };
}

function getCertConfig() {
  const settings = getSettings();
  const exportsConfig = settings.exports || {};
  return {
    path: exportsConfig.cert_path || CERT_P12_PATH || "",
    password: exportsConfig.cert_password || CERT_P12_PASSWORD || ""
  };
}

let updateInProgress = false;
let autoUpdateLastRun = 0;

function runUpdateScript(scriptPath, callback) {
  if (updateInProgress) {
    return callback(new Error("Update already running"), "", "Update already running");
  }
  updateInProgress = true;
  execFile("bash", [scriptPath], { cwd: process.env.REPO_PATH || "/repo" }, (err, stdout, stderr) => {
    updateInProgress = false;
    if (err) {
      return callback(err, stdout || "", stderr || err.message);
    }
    return callback(null, stdout || "", "");
  });
}

function startAutoUpdateScheduler() {
  const hour = 60 * 60 * 1000;
  setInterval(() => {
    try {
      maybeRunAutoUpdate();
    } catch (err) {
      // ignore
    }
  }, hour);
}

function maybeRunAutoUpdate() {
  const settings = getSettings();
  const system = settings.system || {};
  if (!system.updates_enabled || !system.auto_updates_enabled) return;
  const intervalHours = Math.max(1, Number(system.auto_update_interval_hours || 24));
  const now = Date.now();
  if (now - autoUpdateLastRun < intervalHours * 60 * 60 * 1000) return;
  autoUpdateLastRun = now;
  const scriptPath = system.update_script_path || process.env.UPDATE_SCRIPT_PATH || "";
  if (!scriptPath || !fs.existsSync(scriptPath)) return;
  runUpdateScript(scriptPath, () => {});
}

function startRotaScheduler() {
  scheduleRotaScheduler();
}

function scheduleRotaScheduler() {
  const settings = getSettings();
  const rota = settings.rota || {};
  const interval = Math.max(1, Number(rota.scheduler_interval_minutes || 5));
  setTimeout(async () => {
    try {
      await runRotaReminderChecks();
    } catch (err) {
      // ignore
    }
    scheduleRotaScheduler();
  }, interval * 60 * 1000);
}

async function runRotaReminderChecks() {
  const settings = getSettings();
  const rota = settings.rota || {};
  if (!rota.reminders_enabled) return;
  const checkinLead = Number(rota.checkin_lead_minutes || 30);
  const checkoutLead = Number(rota.checkout_lead_minutes || 15);
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const shifts = db
    .prepare("SELECT * FROM rota_shifts WHERE date = ? AND assigned_user_id IS NOT NULL")
    .all(today);
  for (const shift of shifts) {
    const published = db
      .prepare("SELECT is_published FROM rota_weeks WHERE week_start = ? AND location = ? AND department = ?")
      .get(shift.week_start, shift.location, shift.department);
    if (!published || published.is_published !== 1) {
      continue;
    }
    const start = new Date(`${shift.date}T${shift.start_time}`);
    const end = new Date(`${shift.date}T${shift.end_time}`);
    await maybeSendReminder(shift, "checkin", start, checkinLead);
    await maybeSendReminder(shift, "checkout", end, checkoutLead);
  }
}

async function maybeSendReminder(shift, type, time, leadMinutes) {
  const scheduled = new Date(time.getTime() - leadMinutes * 60 * 1000);
  const now = new Date();
  if (now < scheduled || now - scheduled > 5 * 60 * 1000) return;
  const existing = db
    .prepare("SELECT id FROM rota_reminders WHERE shift_id = ? AND type = ?")
    .get(shift.id, type);
  if (existing) return;
  try {
    await sendShiftReminder(shift, type);
    db.prepare(
      "INSERT INTO rota_reminders (id, shift_id, date, type, location, department, scheduled_for, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      nanoid(),
      shift.id,
      shift.date,
      type,
      shift.location,
      shift.department,
      scheduled.toISOString(),
      new Date().toISOString()
    );
  } catch (err) {
    return;
  }
}

async function sendShiftReminder(shift, type) {
  const mailConfig = getEmailConfig();
  if (!mailConfig.host || !mailConfig.from) {
    throw new Error("SMTP not configured");
  }
  const user = db.prepare("SELECT email, name FROM users WHERE id = ?").get(shift.assigned_user_id);
  if (!user) return;
  const subject = type === "checkout" ? "Clock out reminder" : "Clock in reminder";
  const text = `Reminder to ${type === "checkout" ? "clock out" : "clock in"} for your shift on ${shift.date} ${shift.start_time}-${shift.end_time}.`;
  await sendMail(user.email, subject, text, mailConfig);
}
