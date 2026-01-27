const API_BASE = "/api";

const STORAGE_KEYS = {
  token: "tt_token",
  user: "tt_user",
  language: "tt_language"
};

const defaultSettings = {
  company: {
    controller_legal_name: "",
    controller_cif: "",
    controller_address: "",
    controller_contact_email: "",
    controller_contact_phone: "",
    has_dpo: false,
    dpo_name: "",
    dpo_email: "",
    dpo_phone: ""
  },
  representatives: {
    has_worker_reps: false,
    reps_consultation_record: "",
    no_reps_statement: "",
    recording_method_version: "",
    recording_method_effective_date: ""
  },
  time: {
    standard_daily_hours: 8,
    standard_weekly_hours: 40,
    break_rules: {
      min_break_minutes: 30,
      paid_breaks: false,
      break_threshold_hours: 6
    },
    overtime_policy: {
      daily_overtime_threshold: 8,
      weekly_overtime_threshold: 40,
      approval_required: true
    },
    payroll_provider_name: "",
    part_time_monthly_summary_delivery_method: "payroll_attachment"
  },
  geo: {
    geo_capture_events: ["clock_in", "clock_out", "break_start", "break_end"],
    geo_precision: "exact",
    geo_approx_radius_meters: 250,
    geo_visibility_roles: ["HR", "Manager"],
    geo_retention_years: 4,
    geo_notice_version: ""
  },
  privacy: {
    data_retention_years: 4,
    legal_hold_enabled: true,
    privacy_notice_version: "",
    byod_policy_version: "",
    disconnection_policy_version: "",
    record_of_processing_version: ""
  },
  hosting: {
    hosting_provider: "",
    hosting_region: "EU",
    subprocessors_list: [],
    data_processing_agreement_ref: ""
  },
  email: {
    reset_url_base: "https://time.lsltgroup.es/reset.html",
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    smtp_pass: "",
    smtp_from: ""
  },
  rota: {
    reminders_enabled: true,
    checkin_lead_minutes: 30,
    checkout_lead_minutes: 15,
    scheduler_interval_minutes: 5
  },
  system: {
    updates_enabled: false,
    update_token: "",
    update_script_path: "/repo/scripts/self-update.sh",
    setup_complete: false,
    setup_completed_at: ""
  },
  exports: {
    inspectorate_export_format: "pdf_csv",
    export_signature_method: "hash_checksum",
    audit_log_retention_years: 4,
    cert_path: "",
    cert_password: "",
    cert_original_name: "",
    cert_uploaded_at: ""
  }
};

const state = {
  token: load(STORAGE_KEYS.token, null),
  user: load(STORAGE_KEYS.user, null),
  settings: defaultSettings,
  entries: [],
  corrections: [],
  users: [],
  staff: [],
  rota: {
    weekStart: "",
    week: null,
    shifts: []
  },
  compliance: { ready: false, missing: [] },
  language: load(STORAGE_KEYS.language, "es-ES")
};

function load(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function apiFetch(path, options) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options && options.headers ? options.headers : {}) }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

async function apiFetchBlob(path, options) {
  const headers = {};
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options && options.headers ? options.headers : {}) }
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return response.blob();
}

function setLanguage(lang) {
  state.language = lang;
  save(STORAGE_KEYS.language, lang);
  const dict = translations[lang] || translations["es-ES"];
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (dict[key]) node.textContent = dict[key];
  });
}

function showAuthModal(show) {
  const modal = document.getElementById("auth-modal");
  if (show) {
    modal.classList.add("active");
  } else {
    modal.classList.remove("active");
  }
}

function setAuth(token, user) {
  state.token = token;
  state.user = user;
  save(STORAGE_KEYS.token, token);
  save(STORAGE_KEYS.user, user);
}

function clearAuth() {
  state.token = null;
  state.user = null;
  save(STORAGE_KEYS.token, null);
  save(STORAGE_KEYS.user, null);
}

function updateUserUI() {
  const label = document.getElementById("user-label");
  const logout = document.getElementById("logout");
  if (state.user) {
    label.textContent = `${state.user.name || state.user.email}`;
    logout.style.display = "inline-flex";
  } else {
    label.textContent = translations[state.language]["auth.loggedOut"] || "Signed out";
    logout.style.display = "none";
  }
  applyRoleVisibility();
}

async function login() {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value.trim();
  const error = document.getElementById("auth-error");
  error.textContent = "";
  try {
    const result = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setAuth(result.token, result.user);
    showAuthModal(false);
    await bootstrap();
  } catch (err) {
    error.textContent = err.message;
  }
}

async function forgotPassword() {
  const email = document.getElementById("auth-email").value.trim();
  if (!email) return alert("Enter your email first.");
  try {
    await apiFetch("/auth/request-reset", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    alert("Check your email for the reset link.");
  } catch (err) {
    alert(err.message);
  }
}

function logout() {
  clearAuth();
  showAuthModal(true);
  updateUserUI();
}

async function bootstrap() {
  const status = await fetch(`${API_BASE}/setup/status`).then((res) => res.json()).catch(() => null);
  if (status && status.needs_setup && window.location.pathname.indexOf("setup.html") === -1) {
    window.location.href = "/setup.html";
    return;
  }
  if (!state.token) {
    showAuthModal(true);
    updateUserUI();
    return;
  }
  showAuthModal(false);
  await refreshData();
}

async function refreshData() {
  try {
    state.settings = await apiFetch("/settings");
    state.compliance = await apiFetch("/compliance");
    state.entries = await apiFetch("/time/entries");
    state.corrections = await apiFetch("/corrections");
    if (state.user && state.user.role === "admin") {
      state.users = await apiFetch("/users");
    }
    updateUserUI();
    hydrateAdminForm();
    renderUserList();
    renderCertStatus();
    prefillRotaScope();
    refreshUI();
  } catch (err) {
    showAuthModal(true);
    const error = document.getElementById("auth-error");
    if (error) error.textContent = err.message;
  }
}

function initNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
      btn.classList.add("active");
      const target = btn.dataset.view;
      document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
      document.getElementById(`view-${target}`).classList.add("active");
    });
  });
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

function isComplianceReady() {
  return getMissingFields(state.settings).length === 0;
}

function updateComplianceUI() {
  const ready = state.compliance.ready || isComplianceReady();
  const status = document.getElementById("compliance-status");
  const statusValue = document.getElementById("status-value");
  status.textContent = ready ? "Compliance: Ready" : "Compliance: Blocked";
  statusValue.textContent = ready ? "Ready" : "Blocked";
  const list = document.getElementById("compliance-list");
  list.innerHTML = "";
  const checks = [
    { label: "Daily records with start and end", ok: true },
    { label: "4 year retention configured", ok: state.settings.privacy.data_retention_years >= 4 },
    { label: "Geolocation notice version", ok: !!state.settings.geo.geo_notice_version },
    { label: "Payroll summary delivery", ok: !!state.settings.time.payroll_provider_name },
    { label: "Audit trail enabled", ok: state.settings.exports.audit_log_retention_years >= 4 }
  ];
  checks.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = `${item.ok ? "[OK]" : "[!]"} ${item.label}`;
    list.appendChild(li);
  });
  const missing = document.getElementById("missing-fields");
  const missingList = state.compliance.missing && state.compliance.missing.length
    ? state.compliance.missing
    : getMissingFields(state.settings);
  missing.textContent = missingList.length
    ? `Missing: ${missingList.join(", ")}`
    : "All required fields completed.";
}

function updateShiftUI() {
  const entry = getCurrentEntry();
  const status = document.getElementById("shift-status");
  const start = document.getElementById("shift-start");
  const end = document.getElementById("shift-end");
  const breaks = document.getElementById("shift-breaks");
  if (!entry) {
    status.textContent = "Not on shift";
    start.textContent = "--";
    end.textContent = "--";
    breaks.textContent = "0";
    return;
  }
  status.textContent = entry.end ? "Shift complete" : "On shift";
  start.textContent = formatDateTime(entry.start);
  end.textContent = entry.end ? formatDateTime(entry.end) : "--";
  breaks.textContent = entry.breaks ? entry.breaks.length.toString() : "0";
}

function updateEntriesUI() {
  const container = document.getElementById("time-entries");
  container.innerHTML = "";
  state.entries.slice().reverse().forEach((entry) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const workMinutes = getWorkMinutes(entry);
    item.textContent = `${formatDate(entry.start)} | ${formatTime(entry.start)} - ${entry.end ? formatTime(entry.end) : "--"} | ${workMinutes} min`;
    container.appendChild(item);
  });
}

function updateCorrectionsUI() {
  const container = document.getElementById("corrections-list");
  container.innerHTML = "";
  state.corrections.slice().reverse().forEach((c) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const header = document.createElement("div");
    header.textContent = `${formatDateTime(c.created_at)} | ${c.reason} | ${c.status}`;
    item.appendChild(header);
    if (c.resolution_note) {
      const note = document.createElement("div");
      note.textContent = `Note: ${c.resolution_note}`;
      item.appendChild(note);
    }
    if (state.user && (state.user.role === "admin" || state.user.role === "manager") && c.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "button-row";
      const approve = document.createElement("button");
      approve.className = "btn";
      approve.textContent = translations[state.language]["corrections.approve"] || "Approve";
      approve.addEventListener("click", () => updateCorrectionStatus(c.id, "approved"));
      const reject = document.createElement("button");
      reject.className = "btn danger";
      reject.textContent = translations[state.language]["corrections.reject"] || "Reject";
      reject.addEventListener("click", () => updateCorrectionStatus(c.id, "rejected"));
      actions.appendChild(approve);
      actions.appendChild(reject);
      item.appendChild(actions);
    }
    container.appendChild(item);
  });
}

function updateDashboardUI() {
  const lastEntry = state.entries[state.entries.length - 1];
  document.getElementById("last-event").textContent = lastEntry
    ? `${formatDateTime(lastEntry.start)}`
    : "--";
  document.getElementById("geo-status").textContent = "On clock only";
}

async function startShift() {
  if (!isComplianceReady()) return alert("Compliance settings incomplete.");
  const entry = await apiFetch("/time/entries", { method: "POST" });
  await postGeo(entry.id, "clock_in");
  state.entries = await apiFetch("/time/entries");
  refreshUI();
}

async function endShift() {
  const entry = getCurrentEntry();
  if (!entry) return alert("No active shift.");
  await apiFetch(`/time/entries/${entry.id}`, { method: "PATCH" });
  await postGeo(entry.id, "clock_out");
  state.entries = await apiFetch("/time/entries");
  refreshUI();
}

async function startBreak() {
  const entry = getCurrentEntry();
  if (!entry || entry.end) return alert("No active shift.");
  await apiFetch(`/time/entries/${entry.id}/breaks`, { method: "POST" });
  await postGeo(entry.id, "break_start");
  state.entries = await apiFetch("/time/entries");
  refreshUI();
}

async function endBreak() {
  const entry = getCurrentEntry();
  if (!entry || entry.end) return alert("No active shift.");
  const activeBreak = (entry.breaks || []).find((b) => !b.end);
  if (!activeBreak) return alert("No active break.");
  await apiFetch(`/time/entries/${entry.id}/breaks/${activeBreak.id}`, { method: "PATCH" });
  await postGeo(entry.id, "break_end");
  state.entries = await apiFetch("/time/entries");
  refreshUI();
}

async function requestCorrection() {
  const reason = prompt("Reason for correction:");
  if (!reason) return;
  await apiFetch("/corrections", {
    method: "POST",
    body: JSON.stringify({ reason })
  });
  state.corrections = await apiFetch("/corrections");
  refreshUI();
}

async function updateCorrectionStatus(id, status) {
  const note = prompt("Resolution note (optional)");
  try {
    await apiFetch(`/corrections/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, resolution_note: note || null })
    });
    state.corrections = await apiFetch("/corrections");
    refreshUI();
  } catch (err) {
    alert(err.message);
  }
}

async function postGeo(entryId, eventType) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await apiFetch(`/time/entries/${entryId}/geo`, {
          method: "POST",
          body: JSON.stringify({
            event_type: eventType,
            timestamp: new Date().toISOString(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            device_id: "browser"
          })
        });
      } catch (err) {
        console.error(err);
      }
    },
    () => {}
  );
}

function getCurrentEntry() {
  return state.entries.find((entry) => !entry.end) || null;
}

function getWorkMinutes(entry) {
  const end = entry.end ? new Date(entry.end) : new Date();
  const start = new Date(entry.start);
  const totalMinutes = Math.max(0, (end - start) / 60000);
  const breakMinutes = (entry.breaks || []).reduce((acc, br) => {
    if (!br.end) return acc;
    return acc + (new Date(br.end) - new Date(br.start)) / 60000;
  }, 0);
  return Math.round(totalMinutes - breakMinutes);
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString();
}

function refreshUI() {
  updateComplianceUI();
  updateShiftUI();
  updateEntriesUI();
  updateCorrectionsUI();
  updateDashboardUI();
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

function setPath(obj, path, value) {
  const parts = path.split(".");
  let current = obj;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      current[part] = value;
    } else {
      current[part] = current[part] || {};
      current = current[part];
    }
  });
}

function hydrateAdminForm() {
  const inputs = document.querySelectorAll("[data-path]");
  inputs.forEach((input) => {
    const path = input.getAttribute("data-path");
    const value = getPath(state.settings, path);
    if (input.type === "password") {
      input.value = "";
      return;
    }
    if (input.tagName === "SELECT") {
      input.value = String(value);
    } else if (input.tagName === "TEXTAREA") {
      input.value = Array.isArray(value) ? value.join("\n") : value || "";
    } else {
      input.value = value === undefined || value === null ? "" : value;
    }
  });
  const updateToken = document.getElementById("update-token");
  if (updateToken) updateToken.value = "";
}

function bindAdminForm() {
  const inputs = document.querySelectorAll("[data-path]");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const path = input.getAttribute("data-path");
      const parsed = parseInputValue(input);
      setPath(state.settings, path, parsed);
      updateComplianceUI();
    });
  });
}

function parseInputValue(input) {
  if (input.tagName === "SELECT") {
    if (input.value === "true") return true;
    if (input.value === "false") return false;
    return input.value;
  }
  if (input.type === "number") return input.value === "" ? "" : Number(input.value);
  if (input.tagName === "TEXTAREA") {
    return input.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  if (input.getAttribute("data-path") === "geo.geo_visibility_roles") {
    return input.value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return input.value;
}

async function saveSettings() {
  try {
    const updateToken = document.getElementById("update-token");
    if (updateToken && updateToken.value) {
      state.settings.system.update_token = updateToken.value;
    }
    await apiFetch("/settings", {
      method: "PUT",
      body: JSON.stringify(state.settings)
    });
    state.compliance = await apiFetch("/compliance");
    refreshUI();
    alert("Settings saved.");
  } catch (err) {
    alert(err.message);
  }
}

function initLanguagePicker() {
  const picker = document.getElementById("lang");
  picker.value = state.language;
  setLanguage(state.language);
  picker.addEventListener("change", (event) => {
    setLanguage(event.target.value);
  });
}

function initActions() {
  document.getElementById("start-shift").addEventListener("click", startShift);
  document.getElementById("end-shift").addEventListener("click", endShift);
  document.getElementById("start-break").addEventListener("click", startBreak);
  document.getElementById("end-break").addEventListener("click", endBreak);
  document.getElementById("request-correction").addEventListener("click", requestCorrection);
  document.getElementById("quick-clock-in").addEventListener("click", startShift);
  document.getElementById("quick-break").addEventListener("click", startBreak);
  document.getElementById("quick-clock-out").addEventListener("click", endShift);
  document.getElementById("logout").addEventListener("click", logout);
  document.getElementById("auth-submit").addEventListener("click", login);
  document.getElementById("auth-forgot").addEventListener("click", forgotPassword);
  document.getElementById("save-settings").addEventListener("click", saveSettings);
  document.getElementById("refresh-data").addEventListener("click", refreshData);
  document.getElementById("generate-user-password").addEventListener("click", generateUserPassword);
  document.getElementById("create-user").addEventListener("click", createUser);
  document.getElementById("upload-cert").addEventListener("click", uploadCertificate);
  document.getElementById("generate-update-token").addEventListener("click", generateUpdateToken);
  document.getElementById("run-update").addEventListener("click", runUpdate);
  document.getElementById("export-db").addEventListener("click", exportDatabase);
  document.getElementById("import-db").addEventListener("click", importDatabase);
  document.getElementById("rota-load").addEventListener("click", loadRota);
  document.getElementById("rota-add").addEventListener("click", addShift);
  document.getElementById("rota-publish").addEventListener("click", publishRota);
  document.getElementById("rota-unpublish").addEventListener("click", unpublishRota);
  document.getElementById("rota-remind-checkin").addEventListener("click", () => sendRotaReminder("checkin"));
  document.getElementById("rota-remind-checkout").addEventListener("click", () => sendRotaReminder("checkout"));
}

function initReports() {
  const monthInput = document.getElementById("report-month");
  const now = new Date();
  monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("run-report").addEventListener("click", () => {
    const month = monthInput.value;
    runReport(month);
  });
  document.getElementById("export-time").addEventListener("click", () => exportCsv("time"));
  document.getElementById("export-geo").addEventListener("click", () => exportCsv("geo"));
  document.getElementById("export-audit").addEventListener("click", () => exportCsv("audit"));
  document.getElementById("export-pack").addEventListener("click", () => exportPack());
}

function initRota() {
  const weekInput = document.getElementById("rota-week");
  const today = new Date();
  const monday = getWeekStartDate(today);
  weekInput.value = monday;
  document.getElementById("rota-date").value = today.toISOString().split("T")[0];
}

function prefillRotaScope() {
  if (!state.user) return;
  const locationInput = document.getElementById("rota-location-filter");
  const departmentInput = document.getElementById("rota-department-filter");
  const scopes = state.user.scopes || [];
  const primary = scopes[0] || { location: state.user.location || "", department: state.user.department || "" };
  const allowPick = state.user.role !== "admin" && scopes.length > 1;
  const locked = state.user.role !== "admin" && !allowPick;
  if (locationInput && !locationInput.value) {
    locationInput.value = primary.location || "";
  }
  if (departmentInput && !departmentInput.value) {
    departmentInput.value = primary.department || "";
  }
  if (locationInput) locationInput.disabled = locked;
  if (departmentInput) departmentInput.disabled = locked;
}

async function loadRota() {
  const weekStart = document.getElementById("rota-week").value;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  if (!weekStart) return alert("Select a week start.");
  if (state.user && state.user.role === "admin" && (!location || !department)) {
    return alert("Select location and department.");
  }
  state.rota.weekStart = weekStart;
  try {
    const scopeQuery = `&location=${encodeURIComponent(location)}&department=${encodeURIComponent(department)}`;
    state.rota.week = await apiFetch(`/rota/weeks?start=${weekStart}${scopeQuery}`);
    state.rota.shifts = await apiFetch(`/rota/shifts?start=${weekStart}${scopeQuery}`);
    if (state.user && (state.user.role === "admin" || state.user.role === "manager")) {
      state.staff = await apiFetch("/staff");
    } else {
      state.staff = [];
    }
    populateAssignDropdown();
    renderRotaGrid();
    renderStaffList();
    renderRotaStatus();
  } catch (err) {
    alert(err.message);
  }
}

function renderRotaStatus() {
  const status = document.getElementById("rota-status");
  if (!state.rota.week) {
    status.textContent = "--";
    return;
  }
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  status.textContent = state.rota.week.is_published
    ? `Published at ${state.rota.week.published_at || ""} | ${location} / ${department}`
    : `Draft | ${location} / ${department}`;
}

function renderStaffList() {
  const container = document.getElementById("rota-staff");
  container.innerHTML = "";
  const locationFilter = document.getElementById("rota-location-filter").value.trim();
  const departmentFilter = document.getElementById("rota-department-filter").value.trim();
  const filtered = state.staff.filter((user) => userMatchesScope(user, locationFilter, departmentFilter));
  if (!filtered.length) {
    container.textContent = "--";
    return;
  }
  filtered.forEach((user) => {
    const item = document.createElement("div");
    item.className = "list-item rota-staff-item";
    item.draggable = true;
    item.dataset.userId = user.id;
    const loc = user.location || "-";
    const dept = user.department || "-";
    item.textContent = `${user.name || user.email} (${user.role}) | ${loc} / ${dept}`;
    item.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/user-id", user.id);
    });
    container.appendChild(item);
  });
}

function renderRotaGrid() {
  const grid = document.getElementById("rota-grid");
  grid.innerHTML = "";
  if (!state.rota.weekStart) return;
  const days = getWeekDays(state.rota.weekStart);
  days.forEach((date) => {
    const day = document.createElement("div");
    day.className = "rota-day";
    day.dataset.date = date;
    if (state.user && (state.user.role === "admin" || state.user.role === "manager")) {
      day.addEventListener("dragover", (event) => {
        event.preventDefault();
        day.classList.add("drag-over");
      });
      day.addEventListener("dragleave", () => day.classList.remove("drag-over"));
      day.addEventListener("drop", (event) => {
        event.preventDefault();
        day.classList.remove("drag-over");
        const shiftId = event.dataTransfer.getData("text/shift-id");
        if (shiftId) moveShift(shiftId, date);
      });
    }
    const title = document.createElement("h4");
    title.textContent = date;
    day.appendChild(title);
    const shifts = state.rota.shifts.filter((shift) => shift.date === date);
    if (shifts.length === 0) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "--";
      day.appendChild(empty);
    }
    shifts.forEach((shift) => {
      const card = document.createElement("div");
      card.className = "rota-shift";
      card.dataset.shiftId = shift.id;
      if (state.user && (state.user.role === "admin" || state.user.role === "manager")) {
        card.draggable = true;
        card.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("text/shift-id", shift.id);
        });
      }
      const time = document.createElement("div");
      time.textContent = `${shift.start_time} - ${shift.end_time}`;
      const role = document.createElement("div");
      role.className = "rota-assign";
      role.textContent = shift.role || "";
      const assigned = document.createElement("div");
      assigned.className = "rota-assign";
      assigned.textContent = `Assigned: ${resolveUserName(shift.assigned_user_id)}`;
      card.appendChild(time);
      card.appendChild(role);
      card.appendChild(assigned);
      if (shift.location) {
        const location = document.createElement("div");
        location.className = "rota-assign";
        location.textContent = shift.location;
        card.appendChild(location);
      }
      if (shift.department) {
        const department = document.createElement("div");
        department.className = "rota-assign";
        department.textContent = shift.department;
        card.appendChild(department);
      }
      if (shift.notes) {
        const notes = document.createElement("div");
        notes.className = "rota-assign";
        notes.textContent = shift.notes;
        card.appendChild(notes);
      }
      if (state.user && (state.user.role === "admin" || state.user.role === "manager")) {
        const actions = document.createElement("div");
        actions.className = "rota-actions";
        const copyBtn = document.createElement("button");
        copyBtn.className = "btn";
        copyBtn.textContent = translations[state.language]["rota.copy"] || "Copy";
        copyBtn.addEventListener("click", () => copyShift(shift));
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn danger";
        removeBtn.textContent = translations[state.language]["rota.remove"] || "Remove";
        removeBtn.addEventListener("click", () => deleteShift(shift.id));
        actions.appendChild(copyBtn);
        actions.appendChild(removeBtn);
        card.appendChild(actions);
      }
      card.addEventListener("dragover", (event) => {
        event.preventDefault();
        card.classList.add("drag-over");
      });
      card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
      card.addEventListener("drop", (event) => {
        event.preventDefault();
        card.classList.remove("drag-over");
        const userId = event.dataTransfer.getData("text/user-id");
        if (userId) assignShift(shift.id, userId);
      });
      day.appendChild(card);
    });
    grid.appendChild(day);
  });
}

function resolveUserName(userId) {
  if (!userId) return "Unassigned";
  if (state.user && userId === state.user.id) return "You";
  const user = state.staff.find((u) => u.id === userId) || state.users.find((u) => u.id === userId);
  return user ? (user.name || user.email) : "Unknown";
}

function populateAssignDropdown() {
  const select = document.getElementById("rota-assign");
  select.innerHTML = "";
  const locationFilter = document.getElementById("rota-location-filter").value.trim();
  const departmentFilter = document.getElementById("rota-department-filter").value.trim();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = "Unassigned";
  select.appendChild(empty);
  state.staff
    .filter((user) => userMatchesScope(user, locationFilter, departmentFilter))
    .forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = `${user.name || user.email} (${user.role}) ${user.location || ""} ${user.department || ""}`.trim();
      select.appendChild(option);
    });
}

function userMatchesScope(user, locationFilter, departmentFilter) {
  const scopes = user.scopes && user.scopes.length
    ? user.scopes
    : [{ location: user.location, department: user.department }];
  return scopes.some((scope) => {
    if (locationFilter && scope.location !== locationFilter) return false;
    if (departmentFilter && scope.department !== departmentFilter) return false;
    return true;
  });
}

async function addShift() {
  const date = document.getElementById("rota-date").value;
  const start = document.getElementById("rota-start").value;
  const end = document.getElementById("rota-end").value;
  const role = document.getElementById("rota-role").value;
  const location = document.getElementById("rota-location").value;
  const locationScope = document.getElementById("rota-location-filter").value.trim();
  const departmentScope = document.getElementById("rota-department-filter").value.trim();
  const locationValue = locationScope || location;
  const notes = document.getElementById("rota-notes").value;
  const assigned = document.getElementById("rota-assign").value;
  if (!date || !start || !end) return alert("Date, start, and end are required.");
  if (state.user && state.user.role === "admin" && (!locationScope || !departmentScope)) {
    return alert("Select location and department.");
  }
  try {
    await apiFetch("/rota/shifts", {
      method: "POST",
      body: JSON.stringify({
        date,
        start_time: start,
        end_time: end,
        role,
        location: locationValue,
        department: departmentScope,
        notes,
        assigned_user_id: assigned || null
      })
    });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function assignShift(shiftId, userId) {
  try {
    await apiFetch(`/rota/shifts/${shiftId}`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_user_id: userId })
    });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function moveShift(shiftId, date) {
  try {
    await apiFetch(`/rota/shifts/${shiftId}`, {
      method: "PATCH",
      body: JSON.stringify({ date })
    });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function copyShift(shift) {
  const date = prompt("Copy to date (YYYY-MM-DD)", shift.date);
  if (!date) return;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  try {
    await apiFetch(`/rota/shifts/${shift.id}/copy`, {
      method: "POST",
      body: JSON.stringify({ date, location, department })
    });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteShift(shiftId) {
  if (!confirm("Delete shift?")) return;
  try {
    await apiFetch(`/rota/shifts/${shiftId}`, { method: "DELETE" });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function publishRota() {
  const weekStart = document.getElementById("rota-week").value;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  if (!weekStart) return alert("Select a week start.");
  if (state.user && state.user.role === "admin" && (!location || !department)) {
    return alert("Select location and department.");
  }
  try {
    await apiFetch(`/rota/weeks/${weekStart}/publish`, {
      method: "POST",
      body: JSON.stringify({ notify: true, location, department })
    });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function unpublishRota() {
  const weekStart = document.getElementById("rota-week").value;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  if (!weekStart) return alert("Select a week start.");
  if (state.user && state.user.role === "admin" && (!location || !department)) {
    return alert("Select location and department.");
  }
  try {
    await apiFetch(`/rota/weeks/${weekStart}/unpublish`, {
      method: "POST",
      body: JSON.stringify({ location, department })
    });
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

async function sendRotaReminder(type) {
  const today = new Date().toISOString().split("T")[0];
  const date = prompt("Reminder date (YYYY-MM-DD)", today);
  if (!date) return;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  if (state.user && state.user.role === "admin" && (!location || !department)) {
    return alert("Select location and department.");
  }
  try {
    await apiFetch("/rota/reminders", {
      method: "POST",
      body: JSON.stringify({ type, date, location, department })
    });
    alert("Reminder sent.");
  } catch (err) {
    alert(err.message);
  }
}

function getWeekStartDate(date) {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function getWeekDays(weekStart) {
  const base = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(base);
    day.setDate(base.getDate() + idx);
    return day.toISOString().split("T")[0];
  });
}

async function runReport(month) {
  const summary = document.getElementById("report-summary");
  const overtime = document.getElementById("overtime-summary");
  const data = await apiFetch(`/reports/month?month=${month}`);
  summary.textContent = `Entries: ${data.entries} | Total minutes: ${data.totalMinutes}`;
  overtime.innerHTML = "";
  state.entries.forEach((entry) => {
    const minutes = getWorkMinutes(entry);
    const overtimeMinutes = Math.max(0, minutes - state.settings.time.standard_daily_hours * 60);
    if (overtimeMinutes > 0) {
      const item = document.createElement("div");
      item.className = "list-item";
      item.textContent = `${formatDate(entry.start)} | Overtime: ${overtimeMinutes} min`;
      overtime.appendChild(item);
    }
  });
}

async function exportCsv(type) {
  try {
    const content = await apiFetch(`/exports/${type}`, { method: "GET" });
    downloadFile(`${type}.csv`, content);
  } catch (err) {
    alert(err.message);
  }
}

async function exportPack() {
  try {
    const blob = await apiFetchBlob("/exports/pack?format=pdf", { method: "GET" });
    downloadBlob("inspectorate-pack.pdf", blob);
  } catch (err) {
    alert(err.message);
  }
}

function downloadFile(name, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadBlob(name, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function initPolicies() {
  document.querySelectorAll("[data-template]").forEach((button) => {
    button.addEventListener("click", () => {
      const templateKey = button.getAttribute("data-template");
      const content = renderPolicy(templateKey);
      document.getElementById("policy-preview").textContent = content;
    });
  });
}

function renderPolicy(key) {
  const data = flattenSettings(state.settings);
  const templates = {
    time: `Time Recording Policy\nCompany: {{controller_legal_name}}\nVersion: {{recording_method_version}}\nEffective: {{recording_method_effective_date}}\nRetention: {{data_retention_years}} years\n`,
    privacy: `Employee Privacy Notice\nController: {{controller_legal_name}} ({{controller_cif}})\nContact: {{controller_contact_email}}\nRetention: {{data_retention_years}} years\n`,
    geo: `Geolocation Notice\nEvent based only: clock in/out and breaks\nRetention: {{geo_retention_years}} years\n`,
    byod: `BYOD Policy\nVersion: {{byod_policy_version}}\n`,
    disconnect: `Digital Disconnection Policy\nStandard daily hours: {{standard_daily_hours}}\n`
  };
  const template = templates[key] || "--";
  return template.replace(/\{\{(.*?)\}\}/g, (_, token) => data[token.trim()] || "[MISSING]");
}

function flattenSettings(settings) {
  const flat = {};
  function walk(obj) {
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        walk(value);
      } else {
        flat[key] = Array.isArray(value) ? value.join(", ") : value;
      }
    });
  }
  walk(settings);
  return flat;
}

function init() {
  initNav();
  initLanguagePicker();
  bindAdminForm();
  initActions();
  initReports();
  initRota();
  initPolicies();
  updateUserUI();
  bootstrap();
}

function applyRoleVisibility() {
  const reportsTab = document.querySelector('[data-view="reports"]');
  const canViewReports = state.user && (state.user.role === "admin" || state.user.role === "manager");
  const canManageRota = state.user && (state.user.role === "admin" || state.user.role === "manager");
  if (reportsTab) {
    reportsTab.style.display = canViewReports ? "inline-flex" : "none";
  }
  if (!canViewReports) {
    const reportsView = document.getElementById("view-reports");
    if (reportsView && reportsView.classList.contains("active")) {
      document.querySelector('[data-view="dashboard"]').click();
    }
  }
  ["export-time", "export-geo", "export-audit", "export-pack", "run-report"].forEach((id) => {
    const button = document.getElementById(id);
    if (button) {
      button.disabled = !canViewReports;
    }
  });

  const manageIds = [
    "rota-add-card",
    "rota-staff-card",
    "rota-publish",
    "rota-unpublish",
    "rota-remind-checkin",
    "rota-remind-checkout"
  ];
  manageIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = canManageRota ? "" : "none";
    }
  });
  if (state.settings.rota && state.settings.rota.reminders_enabled) {
    ["rota-remind-checkin", "rota-remind-checkout"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
  }
}

function renderUserList() {
  const list = document.getElementById("user-list");
  if (!list) return;
  list.innerHTML = "";
  if (!state.user || state.user.role !== "admin") {
    list.textContent = "Admin access required.";
    return;
  }
  state.users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const header = document.createElement("div");
    const scopes = (user.scopes || []).map((scope) => `${scope.location}/${scope.department}`).join(", ");
    header.textContent = `${user.name || ""} ${user.email} | ${user.role} | ${user.location || "-"} / ${user.department || "-"} | ${user.is_active ? "Active" : "Archived"}`;
    item.appendChild(header);
    if (scopes) {
      const scopeLine = document.createElement("div");
      scopeLine.className = "hint";
      scopeLine.textContent = `Scopes: ${scopes}`;
      item.appendChild(scopeLine);
    }
    const actions = document.createElement("div");
    actions.className = "button-row";
    const toggle = document.createElement("button");
    toggle.className = "btn";
    toggle.textContent = translations[state.language][user.is_active ? "admin.deactivate" : "admin.activate"] || (user.is_active ? "Archive" : "Restore");
    toggle.addEventListener("click", () => toggleUserActive(user));
    const reset = document.createElement("button");
    reset.className = "btn";
    reset.textContent = translations[state.language]["admin.resetPassword"] || "Reset password";
    reset.addEventListener("click", () => resetUserPassword(user));
    actions.appendChild(toggle);
    actions.appendChild(reset);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

async function createUser() {
  if (!state.user || state.user.role !== "admin") return alert("Admin only");
  const name = document.getElementById("user-name").value.trim();
  const email = document.getElementById("user-email").value.trim();
  const location = document.getElementById("user-location").value.trim();
  const department = document.getElementById("user-department").value.trim();
  const scopesText = document.getElementById("user-scopes").value.trim();
  const scopes = parseScopesFromText(scopesText);
  const role = document.getElementById("user-role").value;
  const password = document.getElementById("user-password").value.trim();
  if (!email || !password) return alert("Email and password are required.");
  if ((role === "manager" || role === "employee") && !scopes.length && (!location || !department)) {
    return alert("Location and department are required for staff.");
  }
  try {
    await apiFetch("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, role, password, location, department, scopes })
    });
    state.users = await apiFetch("/users");
    renderUserList();
    document.getElementById("user-name").value = "";
    document.getElementById("user-email").value = "";
    document.getElementById("user-location").value = "";
    document.getElementById("user-department").value = "";
    document.getElementById("user-scopes").value = "";
    document.getElementById("user-password").value = "";
  } catch (err) {
    alert(err.message);
  }
}

function generateUserPassword() {
  const password = generateRandomSecret(14);
  document.getElementById("user-password").value = password;
}

function generateRandomSecret(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateUpdateToken() {
  const token = generateRandomSecret(24);
  const input = document.getElementById("update-token");
  if (input) input.value = token;
}

async function runUpdate() {
  const tokenInput = document.getElementById("update-token");
  const token = tokenInput ? tokenInput.value.trim() : "";
  const status = document.getElementById("update-status");
  try {
    const result = await apiFetch("/admin/update", {
      method: "POST",
      body: JSON.stringify({ token })
    });
    if (status) status.textContent = result.message || "Update triggered.";
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

async function exportDatabase() {
  const status = document.getElementById("update-status");
  try {
    const blob = await apiFetchBlob("/admin/db/export", { method: "GET" });
    downloadBlob("torre-tempo.sqlite", blob);
    if (status) status.textContent = "Database exported.";
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

async function importDatabase() {
  const status = document.getElementById("update-status");
  const fileInput = document.getElementById("db-import-file");
  if (!fileInput || !fileInput.files[0]) {
    if (status) status.textContent = "Select a database file.";
    return;
  }
  const form = new FormData();
  form.append("database", fileInput.files[0]);
  try {
    const response = await fetch(`${API_BASE}/admin/db/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.token}` },
      body: form
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Import failed" }));
      throw new Error(error.error || "Import failed");
    }
    if (status) status.textContent = "Import staged. Restart server to apply.";
    fileInput.value = "";
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

function parseScopesFromText(text) {
  if (!text) return [];
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes("|") ? line.split("|") : line.split(",");
      const location = (parts[0] || "").trim();
      const department = (parts[1] || "").trim();
      return { location, department };
    })
    .filter((scope) => scope.location && scope.department);
}

async function uploadCertificate() {
  if (!state.user || state.user.role !== "admin") return alert("Admin only");
  const fileInput = document.getElementById("cert-file");
  const passwordInput = document.getElementById("cert-password");
  const file = fileInput.files[0];
  if (!file) return alert("Select a certificate file.");
  const form = new FormData();
  form.append("certificate", file);
  if (passwordInput.value) {
    form.append("cert_password", passwordInput.value);
  }
  try {
    const response = await fetch(`${API_BASE}/admin/certificate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.token}` },
      body: form
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }
    passwordInput.value = "";
    fileInput.value = "";
    await refreshData();
  } catch (err) {
    alert(err.message);
  }
}

function renderCertStatus() {
  const status = document.getElementById("cert-status");
  if (!status || !state.settings.exports) return;
  const { cert_original_name, cert_uploaded_at } = state.settings.exports;
  if (!cert_original_name) {
    status.textContent = "No certificate uploaded.";
    return;
  }
  status.textContent = `${translations[state.language]["admin.certStatus"] || "Current certificate"}: ${cert_original_name} (${cert_uploaded_at || ""})`;
}

async function toggleUserActive(user) {
  try {
    const endpoint = user.is_active ? "archive" : "restore";
    await apiFetch(`/users/${user.id}/${endpoint}`, { method: "POST" });
    state.users = await apiFetch("/users");
    renderUserList();
  } catch (err) {
    alert(err.message);
  }
}

async function resetUserPassword(user) {
  const tempPassword = prompt("Temporary password");
  if (!tempPassword) return;
  try {
    await apiFetch(`/users/${user.id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ temp_password: tempPassword })
    });
    alert("Password reset.");
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
