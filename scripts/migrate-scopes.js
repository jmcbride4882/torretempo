const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "torre-tempo.sqlite");

if (!fs.existsSync(dbPath)) {
  console.error(`Database not found at ${dbPath}`);
  process.exit(1);
}

const db = new Database(dbPath);

function columnExists(table, column) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  return info.some((col) => col.name === column);
}

function ensureColumn(table, column, type) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

function ensureTable(table, columnsSql) {
  db.exec(`CREATE TABLE IF NOT EXISTS ${table} (${columnsSql})`);
}

function getDefaults() {
  const row = db.prepare("SELECT data FROM settings WHERE id = 1").get();
  if (!row) return { location: "default", department: "general" };
  const settings = JSON.parse(row.data);
  const locations = (settings.directories && settings.directories.locations) || [];
  const departments = (settings.directories && settings.directories.departments) || [];
  return {
    location: locations[0] || "default",
    department: departments[0] || "general"
  };
}

function migrate() {
  const defaults = getDefaults();

  ensureColumn("users", "location", "TEXT");
  ensureColumn("users", "department", "TEXT");
  ensureColumn("rota_weeks", "location", "TEXT");
  ensureColumn("rota_weeks", "department", "TEXT");
  ensureColumn("rota_shifts", "location", "TEXT");
  ensureColumn("rota_shifts", "department", "TEXT");
  ensureTable("user_scopes", "user_id TEXT NOT NULL, location TEXT NOT NULL, department TEXT NOT NULL, PRIMARY KEY (user_id, location, department)");

  const users = db.prepare("SELECT id, location, department FROM users").all();
  const updateUser = db.prepare("UPDATE users SET location = ?, department = ? WHERE id = ?");
  const insertScope = db.prepare("INSERT OR IGNORE INTO user_scopes (user_id, location, department) VALUES (?, ?, ?)");

  users.forEach((user) => {
    const location = user.location || defaults.location;
    const department = user.department || defaults.department;
    updateUser.run(location, department, user.id);
    insertScope.run(user.id, location, department);
  });

  db.prepare("UPDATE rota_weeks SET location = ? WHERE location IS NULL OR location = ''").run(defaults.location);
  db.prepare("UPDATE rota_weeks SET department = ? WHERE department IS NULL OR department = ''").run(defaults.department);
  db.prepare("UPDATE rota_shifts SET location = ? WHERE location IS NULL OR location = ''").run(defaults.location);
  db.prepare("UPDATE rota_shifts SET department = ? WHERE department IS NULL OR department = ''").run(defaults.department);

  console.log("Migration complete.");
}

try {
  db.exec("BEGIN");
  migrate();
  db.exec("COMMIT");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Migration failed:", err.message);
  process.exit(1);
}
