require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
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

if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
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

app.use(helmet());
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "2mb" }));

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
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      location: user.location || "default",
      department: user.department || "general"
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
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      location: user.location || "",
      department: user.department || ""
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
  setSettings(merged);
  logAudit(req.user.id, "settings_update", "settings", "1", {});
  res.json({ ok: true });
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
        "SELECT id, email, name, role, is_active, location, department FROM users WHERE is_active = 1 AND location = ? AND department = ? ORDER BY name ASC"
      )
      .all(req.user.location, req.user.department);
  } else {
    users = db
      .prepare("SELECT id, email, name, role, is_active, location, department FROM users WHERE is_active = 1 ORDER BY name ASC")
      .all();
  }
  res.json(users);
});

app.get("/api/rota/weeks", requireAuth, (req, res) => {
  const start = req.query.start;
  if (!start) return res.status(400).json({ error: "start is required" });
  const scope = resolveScope(req);
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
      return renderPdfPack(res, payload).catch(() => res.status(500).json({ error: "PDF render failed" }));
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
  res.json(users);
});

app.post("/api/users", requireAuth, requireRole(["admin"]), (req, res) => {
  const { email, password, name, role } = req.body || {};
  if (!email || !password || !role) return res.status(400).json({ error: "Missing fields" });
  const hash = bcrypt.hashSync(password, 10);
  const user = {
    id: nanoid(),
    email,
    password_hash: hash,
    name: name || "",
    role,
    is_active: 1,
    archived_at: null,
    location: req.body.location || "",
    department: req.body.department || "",
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
    created_at: user.created_at
  });
});

app.patch("/api/users/:id", requireAuth, requireRole(["admin"]), (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Not found" });
  const name = req.body.name !== undefined ? req.body.name : user.name;
  const role = req.body.role !== undefined ? req.body.role : user.role;
  const location = req.body.location !== undefined ? req.body.location : user.location;
  const department = req.body.department !== undefined ? req.body.department : user.department;
  db.prepare("UPDATE users SET name = ?, role = ?, location = ?, department = ? WHERE id = ?").run(
    name,
    role,
    location,
    department,
    user.id
  );
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
    location,
    department
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
    throw new Error("Certificate not configured");
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

function getWeekStart(dateStr) {
  const date = new Date(`${dateStr}T00:00:00Z`);
  const day = date.getUTCDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setUTCDate(date.getUTCDate() + diff);
  return date.toISOString().split("T")[0];
}

function resolveScope(req, source) {
  if (req.user.role !== "admin") {
    return {
      location: req.user.location || "default",
      department: req.user.department || "general"
    };
  }
  const location = source && source.location ? source.location : req.user.location;
  const department = source && source.department ? source.department : req.user.department;
  return {
    location: location || "default",
    department: department || "general"
  };
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
