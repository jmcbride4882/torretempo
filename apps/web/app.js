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
  directories: {
    locations: ["default"],
    departments: ["general"]
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
    public_base_url: "",
    auto_updates_enabled: false,
    auto_update_interval_hours: 24,
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
  availability: [],
  timeOff: [],
  rotaTemplates: [],
  rotaConflicts: { map: {}, list: [] },
  profile: {
    data: {},
    selfieUrl: "",
    selfieUploadedAt: null
  },
  geo: {
    events: [],
    map: null,
    markers: []
  },
  invites: [],
  monthly: {
    my: null,
    list: []
  },
  rota: {
    weekStart: "",
    week: null,
    shifts: [],
    editing: null
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
    if (!state.settings.directories) {
      state.settings.directories = { locations: [], departments: [] };
    }
    state.compliance = await apiFetch("/compliance");
    state.entries = await apiFetch("/time/entries");
    state.corrections = await apiFetch("/corrections");
    let profileResponse = null;
    try {
      profileResponse = await apiFetch("/profile");
    } catch (err) {
      profileResponse = { profile: {}, email: state.user ? state.user.email : "", name: state.user ? state.user.name : "" };
    }
    state.profile = {
      data: profileResponse.profile || {},
      selfieUrl: state.profile.selfieUrl || "",
      selfieUploadedAt: profileResponse.selfie_uploaded_at || null,
      email: profileResponse.email || "",
      name: profileResponse.name || "",
      role: profileResponse.role || ""
    };
    if (state.user && state.user.role === "admin") {
      state.users = await apiFetch("/users");
      try {
        state.invites = await apiFetch("/invites");
      } catch (err) {
        state.invites = [];
      }
    }
    updateUserUI();
    hydrateAdminForm();
    renderUserList();
    renderCertStatus();
    renderDirectories();
    populateDirectoryOptions();
    prefillRotaScope();
    renderProfile();
    renderInvites();
    populateGeoUsers();
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
      onViewChanged(target);
    });
  });
}

function onViewChanged(target) {
  if (!state.token) return;
  if (target === "my-report") {
    resizeSignaturePad();
    loadMyMonthlyReport();
  }
  if (target === "rota") {
    loadRota();
  }
  if (target === "locations") {
    ensureGeoMap();
    populateGeoUsers();
    loadGeoEvents();
  }
  if (target === "profile") {
    renderProfile();
    loadSelfiePreview();
  }
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
  const worked = document.getElementById("shift-worked");
  if (!entry) {
    status.textContent = "Not on shift";
    start.textContent = "--";
    end.textContent = "--";
    breaks.textContent = "0";
    if (worked) worked.textContent = "--";
    return;
  }
  status.textContent = entry.end ? "Shift complete" : "On shift";
  start.textContent = formatDateTime(entry.start);
  end.textContent = entry.end ? formatDateTime(entry.end) : "--";
  breaks.textContent = entry.breaks ? entry.breaks.length.toString() : "0";
  if (worked) worked.textContent = formatDuration(getWorkMinutes(entry));
}

function updateLiveClock() {
  const now = new Date();
  const liveTime = document.getElementById("shift-live-time");
  if (liveTime) liveTime.textContent = now.toLocaleTimeString();
  const entry = getCurrentEntry();
  const worked = document.getElementById("shift-worked");
  if (worked) {
    worked.textContent = entry ? formatDuration(getWorkMinutes(entry)) : "--";
  }
}

function updateEntriesUI() {
  const container = document.getElementById("time-entries");
  container.innerHTML = "";
  state.entries.slice().reverse().forEach((entry) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const workMinutes = getWorkMinutes(entry);
    const header = document.createElement("div");
    header.className = "item-header";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = formatDate(entry.start);
    const badges = document.createElement("div");
    badges.className = "item-badges";
    badges.appendChild(createBadge(formatDuration(workMinutes), "neutral"));
    header.appendChild(title);
    header.appendChild(badges);
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${formatTime(entry.start)} - ${entry.end ? formatTime(entry.end) : "--"}`;
    item.appendChild(header);
    item.appendChild(meta);
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
    header.className = "item-header";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = c.reason || "Correction";
    header.appendChild(title);
    header.appendChild(createStatusBadge(c.status || "pending"));
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = formatDateTime(c.created_at);
    item.appendChild(header);
    item.appendChild(meta);
    if (c.resolution_note) {
      const note = document.createElement("div");
      note.className = "item-meta";
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
    const brEnd = br.end ? new Date(br.end) : new Date();
    return acc + (brEnd - new Date(br.start)) / 60000;
  }, 0);
  return Math.round(totalMinutes - breakMinutes);
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "--";
  const hrs = Math.floor(minutes / 60);
  const mins = Math.abs(minutes % 60);
  return `${hrs}h ${String(mins).padStart(2, "0")}m`;
}

function getStatusTone(status) {
  const value = String(status || "").toLowerCase();
  if (["approved", "active", "published", "used", "sent", "complete"].includes(value)) return "success";
  if (["pending", "draft", "awaiting"].includes(value)) return "warning";
  if (["rejected", "revoked", "expired", "archived", "failed"].includes(value)) return "danger";
  return "neutral";
}

function createBadge(label, tone = "neutral") {
  const badge = document.createElement("span");
  badge.className = `badge ${tone}`;
  badge.textContent = label;
  return badge;
}

function createStatusBadge(status) {
  const label = status ? String(status).replace(/_/g, " ") : "--";
  return createBadge(label, getStatusTone(status));
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

function formatDayLabel(value) {
  if (!value) return "--";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
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
  document.getElementById("add-location").addEventListener("click", () => addDirectoryItem("locations"));
  document.getElementById("add-department").addEventListener("click", () => addDirectoryItem("departments"));
  document.getElementById("rota-load").addEventListener("click", loadRota);
  document.getElementById("rota-add").addEventListener("click", addShift);
  document.getElementById("rota-update").addEventListener("click", updateShift);
  document.getElementById("rota-cancel").addEventListener("click", clearRotaEdit);
  document.getElementById("rota-publish").addEventListener("click", publishRota);
  document.getElementById("rota-unpublish").addEventListener("click", unpublishRota);
  document.getElementById("rota-remind-checkin").addEventListener("click", () => sendRotaReminder("checkin"));
  document.getElementById("rota-remind-checkout").addEventListener("click", () => sendRotaReminder("checkout"));
  document.getElementById("rota-prev-week").addEventListener("click", () => shiftRotaWeek(-7));
  document.getElementById("rota-next-week").addEventListener("click", () => shiftRotaWeek(7));
  document.getElementById("rota-today-week").addEventListener("click", setRotaWeekToToday);
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
  const monthlyInput = document.getElementById("monthly-report-month");
  if (monthlyInput) {
    monthlyInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const monthlyLoad = document.getElementById("monthly-report-load");
  if (monthlyLoad) {
    monthlyLoad.addEventListener("click", loadMonthlyReports);
  }
}

let signatureState = {
  hasStroke: false,
  canvas: null,
  ctx: null
};

let liveClockTimer = null;

function initMyReport() {
  const now = new Date();
  const monthInput = document.getElementById("my-report-month");
  if (monthInput) {
    monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  const loadBtn = document.getElementById("my-report-load");
  if (loadBtn) loadBtn.addEventListener("click", loadMyMonthlyReport);
  const downloadBtn = document.getElementById("my-report-download");
  if (downloadBtn) downloadBtn.addEventListener("click", downloadMyMonthlyReport);
  const clearBtn = document.getElementById("signature-clear");
  if (clearBtn) clearBtn.addEventListener("click", clearSignaturePad);
  const signBtn = document.getElementById("signature-save");
  if (signBtn) signBtn.addEventListener("click", signMonthlyReport);
  initSignaturePad();
}

function initGeo() {
  const toInput = document.getElementById("geo-to");
  const fromInput = document.getElementById("geo-from");
  if (toInput && fromInput) {
    const now = new Date();
    const from = new Date();
    from.setDate(now.getDate() - 7);
    toInput.value = now.toISOString().split("T")[0];
    fromInput.value = from.toISOString().split("T")[0];
  }
  const loadBtn = document.getElementById("geo-load");
  if (loadBtn) loadBtn.addEventListener("click", loadGeoEvents);
}

function initProfile() {
  const saveBtn = document.getElementById("profile-save");
  if (saveBtn) saveBtn.addEventListener("click", saveProfile);
  const uploadBtn = document.getElementById("selfie-upload");
  if (uploadBtn) uploadBtn.addEventListener("click", uploadSelfie);
}

function initInvites() {
  const inviteBtn = document.getElementById("invite-create");
  if (inviteBtn) inviteBtn.addEventListener("click", createInvite);
  const roleSelect = document.getElementById("invite-role");
  if (roleSelect) roleSelect.addEventListener("change", updateInviteScopeVisibility);
  updateInviteScopeVisibility();
}

function initRotaTools() {
  const saveTemplate = document.getElementById("rota-template-save");
  if (saveTemplate) saveTemplate.addEventListener("click", saveTemplateFromWeek);
  const applyTemplate = document.getElementById("rota-template-apply");
  if (applyTemplate) applyTemplate.addEventListener("click", applySelectedTemplate);
  const deleteTemplate = document.getElementById("rota-template-delete");
  if (deleteTemplate) deleteTemplate.addEventListener("click", deleteSelectedTemplate);
  const copyWeek = document.getElementById("rota-copy-run");
  if (copyWeek) copyWeek.addEventListener("click", copyWeekShifts);
}

function initAvailability() {
  const addBtn = document.getElementById("availability-add");
  if (addBtn) addBtn.addEventListener("click", addAvailabilityRule);
  const userSelect = document.getElementById("availability-user");
  if (userSelect) userSelect.addEventListener("change", renderAvailabilityList);
}

function initTimeOff() {
  const addBtn = document.getElementById("timeoff-add");
  if (addBtn) addBtn.addEventListener("click", requestTimeOff);
  const userSelect = document.getElementById("timeoff-user");
  if (userSelect) userSelect.addEventListener("change", renderTimeOffList);
}

function initNotifyModal() {
  const openBtn = document.getElementById("rota-notify");
  const sendBtn = document.getElementById("rota-notify-send");
  const cancelBtn = document.getElementById("rota-notify-cancel");
  const modal = document.getElementById("rota-notify-modal");
  if (openBtn) openBtn.addEventListener("click", () => toggleNotifyModal(true));
  if (sendBtn) sendBtn.addEventListener("click", sendRotaNotifications);
  if (cancelBtn) cancelBtn.addEventListener("click", () => toggleNotifyModal(false));
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) toggleNotifyModal(false);
    });
  }
}

function initRota() {
  const weekInput = document.getElementById("rota-week");
  const today = new Date();
  const monday = getWeekStartDate(today);
  weekInput.value = monday;
  document.getElementById("rota-date").value = today.toISOString().split("T")[0];
  weekInput.addEventListener("change", loadRota);
  const locationFilter = document.getElementById("rota-location-filter");
  const departmentFilter = document.getElementById("rota-department-filter");
  if (locationFilter) locationFilter.addEventListener("change", loadRota);
  if (departmentFilter) departmentFilter.addEventListener("change", loadRota);
  initRotaFilters();
  renderRotaRoleFilter();
  initRotaTools();
  initAvailability();
  initTimeOff();
  initNotifyModal();
  clearRotaEdit();
}

function initRotaFilters() {
  const search = document.getElementById("rota-search");
  const roleFilter = document.getElementById("rota-role-filter");
  const clear = document.getElementById("rota-clear-filters");
  if (search) {
    search.addEventListener("input", () => {
      renderRotaGrid();
      renderStaffList();
      renderUnassignedShifts();
    });
  }
  if (roleFilter) {
    roleFilter.addEventListener("change", () => {
      renderRotaGrid();
      renderUnassignedShifts();
    });
  }
  if (clear) {
    clear.addEventListener("click", () => {
      if (search) search.value = "";
      if (roleFilter) roleFilter.value = "";
      renderRotaGrid();
      renderStaffList();
      renderUnassignedShifts();
    });
  }
}

function prefillRotaScope() {
  if (!state.user) return;
  const locationInput = document.getElementById("rota-location-filter");
  const departmentInput = document.getElementById("rota-department-filter");
  const scopes = state.user.scopes || [];
  const primary = scopes[0] || { location: state.user.location || "", department: state.user.department || "" };
  const allowPick = state.user.role !== "admin" && scopes.length > 1;
  const locked = state.user.role !== "admin" && !allowPick;
  const locations = (state.settings.directories && state.settings.directories.locations) || [];
  const departments = (state.settings.directories && state.settings.directories.departments) || [];
  if (locationInput && !locationInput.value) {
    locationInput.value = primary.location || locations[0] || "";
  }
  if (departmentInput && !departmentInput.value) {
    departmentInput.value = primary.department || departments[0] || "";
  }
  if (locationInput) locationInput.disabled = locked;
  if (departmentInput) departmentInput.disabled = locked;
}

async function loadRota() {
  const weekStart = document.getElementById("rota-week").value;
  const locationInput = document.getElementById("rota-location-filter");
  const departmentInput = document.getElementById("rota-department-filter");
  let location = locationInput.value.trim();
  let department = departmentInput.value.trim();
  if (!weekStart) return alert("Select a week start.");
  if (state.user && state.user.role === "admin" && (!location || !department)) {
    if (!location && locationInput.options.length > 1) {
      locationInput.value = locationInput.options[1].value;
    }
    if (!department && departmentInput.options.length > 1) {
      departmentInput.value = departmentInput.options[1].value;
    }
    location = locationInput.value.trim();
    department = departmentInput.value.trim();
    if (!location || !department) {
      return alert("Select location and department.");
    }
  }
  if (!isScopeAllowed(location, department)) {
    return alert("Selected scope not allowed.");
  }
  const locationSelect = document.getElementById("rota-location");
  const departmentSelect = document.getElementById("rota-department");
  if (locationSelect && location) locationSelect.value = location;
  if (departmentSelect && department) departmentSelect.value = department;
  state.rota.weekStart = weekStart;
  const templateWeek = document.getElementById("rota-template-week");
  if (templateWeek && !templateWeek.value) templateWeek.value = weekStart;
  const copyWeek = document.getElementById("rota-copy-week");
  if (copyWeek && !copyWeek.value) {
    const next = new Date(`${weekStart}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 7);
    copyWeek.value = next.toISOString().split("T")[0];
  }
  try {
    const scopeQuery = `&location=${encodeURIComponent(location)}&department=${encodeURIComponent(department)}`;
    state.rota.week = await apiFetch(`/rota/weeks?start=${weekStart}${scopeQuery}`);
    state.rota.shifts = await apiFetch(`/rota/shifts?start=${weekStart}${scopeQuery}`);
    if (state.user && (state.user.role === "admin" || state.user.role === "manager")) {
      state.staff = await apiFetch("/staff");
    } else {
      state.staff = [];
    }
    await loadRotaSupportingData(location, department, weekStart);
    computeRotaConflicts();
    populateAssignDropdown();
    renderRotaRoleFilter();
    renderRotaGrid();
    renderStaffList();
    renderRotaStatus();
    renderRotaSummary();
    renderUnassignedShifts();
    renderAvailabilityList();
    renderTimeOffList();
    renderConflictList();
  } catch (err) {
    alert(err.message);
  }
}

function renderRotaStatus() {
  const status = document.getElementById("rota-status");
  const weekStatus = document.getElementById("rota-week-status");
  const weekSummary = document.getElementById("rota-week-summary");
  const notifyBtn = document.getElementById("rota-notify");
  if (!state.rota.week) {
    status.textContent = "--";
    if (weekStatus) weekStatus.textContent = "--";
    if (weekSummary) weekSummary.textContent = "--";
    if (notifyBtn) notifyBtn.disabled = true;
    return;
  }
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  const isPublished = state.rota.week.is_published;
  const statusLabel = isPublished
    ? translations[state.language]["rota.statusPublished"] || "Published"
    : translations[state.language]["rota.statusDraft"] || "Draft";
  const publishedAt = state.rota.week.published_at ? formatDateTime(state.rota.week.published_at) : "";
  status.textContent = isPublished
    ? `${statusLabel} ${publishedAt ? `(${publishedAt})` : ""} | ${location} / ${department}`
    : `${statusLabel} | ${location} / ${department}`;
  if (weekStatus) weekStatus.textContent = statusLabel;
  if (weekStatus) {
    weekStatus.classList.remove("published", "draft");
    weekStatus.classList.add(isPublished ? "published" : "draft");
  }
  if (weekSummary) {
    const weekLabel = `${translations[state.language]["rota.weekOf"] || "Week of"} ${state.rota.weekStart}`;
    const shiftCount = state.rota.shifts.length;
    const conflicts = state.rotaConflicts.list ? state.rotaConflicts.list.length : 0;
    const conflictLabel = translations[state.language]["rota.conflicts"] || "Conflicts";
    weekSummary.textContent = `${weekLabel} · ${shiftCount} ${translations[state.language]["rota.shifts"] || "shifts"}`
      + (conflicts ? ` · ${conflicts} ${conflictLabel}` : "");
  }
  if (notifyBtn) notifyBtn.disabled = !isPublished;
}

function renderRotaSummary() {
  const container = document.getElementById("rota-summary");
  if (!container) return;
  if (!state.rota.shifts || !state.rota.shifts.length) {
    container.innerHTML = "";
    return;
  }
  const totalShifts = state.rota.shifts.length;
  const assigned = state.rota.shifts.filter((shift) => shift.assigned_user_id).length;
  const unassigned = totalShifts - assigned;
  const totalMinutes = state.rota.shifts.reduce((acc, shift) => acc + getShiftMinutes(shift), 0);
  container.innerHTML = "";
  const items = [
    { label: translations[state.language]["rota.totalShifts"] || "Total shifts", value: totalShifts },
    { label: translations[state.language]["rota.assigned"] || "Assigned", value: assigned },
    { label: translations[state.language]["rota.unassigned"] || "Unassigned", value: unassigned },
    { label: translations[state.language]["rota.totalHours"] || "Total hours", value: formatHours(totalMinutes) }
  ];
  items.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "rota-chip";
    const label = document.createElement("span");
    label.textContent = item.label;
    const value = document.createElement("strong");
    value.textContent = item.value;
    chip.appendChild(label);
    chip.appendChild(value);
    container.appendChild(chip);
  });
}

async function loadRotaSupportingData(location, department, weekStart) {
  if (!state.user) return;
  const weekEnd = getWeekEndDate(weekStart);
  if (state.user.role === "employee") {
    try {
      state.availability = await apiFetch("/availability");
    } catch (err) {
      state.availability = [];
    }
    try {
      const params = new URLSearchParams();
      if (weekStart) params.set("from", weekStart);
      if (weekEnd) params.set("to", weekEnd);
      state.timeOff = await apiFetch(`/time-off?${params.toString()}`);
    } catch (err) {
      state.timeOff = [];
    }
    state.rotaTemplates = [];
    populateRotaUserSelects();
    renderRotaTemplates();
    return;
  }
  const userIds = state.staff.map((user) => user.id).join(",");
  try {
    state.availability = await apiFetch(`/availability?user_ids=${encodeURIComponent(userIds)}`);
  } catch (err) {
    state.availability = [];
  }
  try {
    const params = new URLSearchParams();
    if (userIds) params.set("user_ids", userIds);
    if (weekStart) params.set("from", weekStart);
    if (weekEnd) params.set("to", weekEnd);
    state.timeOff = await apiFetch(`/time-off?${params.toString()}`);
  } catch (err) {
    state.timeOff = [];
  }
  try {
    const params = new URLSearchParams();
    if (location) params.set("location", location);
    if (department) params.set("department", department);
    state.rotaTemplates = await apiFetch(`/rota/templates?${params.toString()}`);
  } catch (err) {
    state.rotaTemplates = [];
  }
  populateRotaUserSelects();
  renderRotaTemplates();
}

function populateRotaUserSelects() {
  const availabilityUser = document.getElementById("availability-user");
  const timeoffUser = document.getElementById("timeoff-user");
  const users = state.user && (state.user.role === "admin" || state.user.role === "manager")
    ? state.staff
    : state.user
      ? [state.user]
      : [];
  [availabilityUser, timeoffUser].forEach((select) => {
    if (!select) return;
    const current = select.value;
    select.innerHTML = "";
    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.name || user.email;
      select.appendChild(option);
    });
    if (current && users.some((user) => user.id === current)) {
      select.value = current;
    }
    if (state.user && state.user.role === "employee") {
      select.disabled = true;
    }
  });
}

function renderRotaTemplates() {
  const select = document.getElementById("rota-template-select");
  const applyBtn = document.getElementById("rota-template-apply");
  const deleteBtn = document.getElementById("rota-template-delete");
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  if (!state.rotaTemplates.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = translations[state.language]["rota.noTemplates"] || "No templates";
    select.appendChild(opt);
    if (applyBtn) applyBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    return;
  }
  state.rotaTemplates.forEach((template) => {
    const opt = document.createElement("option");
    opt.value = template.id;
    opt.textContent = template.name;
    select.appendChild(opt);
  });
  if (current && state.rotaTemplates.some((template) => template.id === current)) {
    select.value = current;
  }
  if (applyBtn) applyBtn.disabled = false;
  if (deleteBtn) deleteBtn.disabled = false;
}

function renderAvailabilityList() {
  const container = document.getElementById("availability-list");
  if (!container) return;
  const userId = document.getElementById("availability-user")?.value;
  if (!userId) {
    container.textContent = "--";
    return;
  }
  const rules = (state.availability || []).filter((rule) => rule.user_id === userId);
  container.innerHTML = "";
  if (!rules.length) {
    container.textContent = "--";
    return;
  }
  rules
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
    .forEach((rule) => {
      const item = document.createElement("div");
      item.className = "list-item";
      const dayLabel = getDayLabel(rule.day_of_week);
      const header = document.createElement("div");
      header.className = "item-header";
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = dayLabel;
      header.appendChild(title);
      header.appendChild(createBadge(`${rule.start_time}-${rule.end_time}`, "neutral"));
      item.appendChild(header);
      if (state.user && (state.user.role === "admin" || state.user.role === "manager" || state.user.id === rule.user_id)) {
        const actions = document.createElement("div");
        actions.className = "button-row";
        const remove = document.createElement("button");
        remove.className = "btn danger";
        remove.textContent = translations[state.language]["rota.remove"] || "Remove";
        remove.addEventListener("click", () => removeAvailabilityRule(rule.id));
        actions.appendChild(remove);
        item.appendChild(actions);
      }
      container.appendChild(item);
    });
}

function renderTimeOffList() {
  const container = document.getElementById("timeoff-list");
  if (!container) return;
  const userId = document.getElementById("timeoff-user")?.value;
  if (!userId) {
    container.textContent = "--";
    return;
  }
  const records = (state.timeOff || []).filter((item) => item.user_id === userId);
  container.innerHTML = "";
  if (!records.length) {
    container.textContent = "--";
    return;
  }
  records.forEach((record) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const statusLabel = record.status || "pending";
    const header = document.createElement("div");
    header.className = "item-header";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = `${record.start_date} → ${record.end_date}`;
    header.appendChild(title);
    header.appendChild(createStatusBadge(statusLabel));
    item.appendChild(header);
    if (record.reason) {
      const reason = document.createElement("div");
      reason.className = "item-meta";
      reason.textContent = record.reason;
      item.appendChild(reason);
    }
    if (state.user && (state.user.role === "admin" || state.user.role === "manager") && record.status === "pending") {
      const actions = document.createElement("div");
      actions.className = "button-row";
      const approve = document.createElement("button");
      approve.className = "btn";
      approve.textContent = translations[state.language]["rota.approve"] || "Approve";
      approve.addEventListener("click", () => updateTimeOff(record.id, "approved"));
      const reject = document.createElement("button");
      reject.className = "btn danger";
      reject.textContent = translations[state.language]["rota.reject"] || "Reject";
      reject.addEventListener("click", () => updateTimeOff(record.id, "rejected"));
      actions.appendChild(approve);
      actions.appendChild(reject);
      item.appendChild(actions);
    }
    container.appendChild(item);
  });
}

function renderConflictList() {
  const container = document.getElementById("rota-conflicts");
  if (!container) return;
  container.innerHTML = "";
  const list = state.rotaConflicts.list || [];
  if (!list.length) {
    container.textContent = "--";
    return;
  }
  list.forEach((conflict) => {
    const item = document.createElement("div");
    item.className = "list-item conflict-item";
    if (conflict.severity === "danger") item.classList.add("danger");
    item.textContent = conflict.message;
    container.appendChild(item);
  });
}

function computeRotaConflicts() {
  const shifts = state.rota.shifts || [];
  const warnings = {};
  const conflictList = [];

  const addWarning = (shiftId, type, message, severity) => {
    if (!warnings[shiftId]) warnings[shiftId] = [];
    warnings[shiftId].push({ type, message, severity });
    conflictList.push({ shiftId, message, severity });
  };

  const timeOffByUser = (state.timeOff || []).reduce((acc, record) => {
    if (!acc[record.user_id]) acc[record.user_id] = [];
    acc[record.user_id].push(record);
    return acc;
  }, {});

  const availabilityByUser = (state.availability || []).reduce((acc, rule) => {
    if (!acc[rule.user_id]) acc[rule.user_id] = [];
    acc[rule.user_id].push(rule);
    return acc;
  }, {});

  const shiftsByUserDate = shifts.reduce((acc, shift) => {
    if (!shift.assigned_user_id) return acc;
    const key = `${shift.assigned_user_id}|${shift.date}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(shift);
    return acc;
  }, {});

  Object.values(shiftsByUserDate).forEach((items) => {
    const sorted = items.slice().sort(sortShiftsByTime);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        if (shiftsOverlap(sorted[i], sorted[j])) {
          const label = translations[state.language]["rota.conflictOverlap"] || "Overlapping shift";
          const name = getUserDisplayName(sorted[i].assigned_user_id) || "";
          addWarning(sorted[i].id, "overlap", `${label}: ${name} ${sorted[i].date}`, "danger");
          addWarning(sorted[j].id, "overlap", `${label}: ${name} ${sorted[j].date}`, "danger");
        }
      }
    }
  });

  shifts.forEach((shift) => {
    if (!shift.assigned_user_id) return;
    const records = timeOffByUser[shift.assigned_user_id] || [];
    records.forEach((record) => {
      if (record.status === "rejected") return;
      if (!isDateBetween(shift.date, record.start_date, record.end_date)) return;
      const status = record.status || "pending";
      const label = status === "approved"
        ? translations[state.language]["rota.conflictTimeOff"] || "Approved time off"
        : translations[state.language]["rota.conflictPending"] || "Pending time off";
      const severity = status === "approved" ? "danger" : "warning";
      addWarning(shift.id, "time_off", `${label}: ${record.start_date} → ${record.end_date}`, severity);
    });
  });

  shifts.forEach((shift) => {
    if (!shift.assigned_user_id) return;
    const rules = availabilityByUser[shift.assigned_user_id] || [];
    if (!rules.length) return;
    const dayIndex = getDayIndex(shift.date);
    const slots = rules.filter((rule) => rule.day_of_week === dayIndex && rule.is_available === 1);
    if (!slots.length) {
      const label = translations[state.language]["rota.conflictAvailability"] || "Outside availability";
      addWarning(shift.id, "availability", label, "warning");
      return;
    }
    const shiftStart = parseTimeToMinutes(shift.start_time);
    let shiftEnd = parseTimeToMinutes(shift.end_time);
    if (shiftStart === null || shiftEnd === null) return;
    if (shiftEnd <= shiftStart) shiftEnd += 24 * 60;
    const isWithin = slots.some((slot) => {
      const slotStart = parseTimeToMinutes(slot.start_time);
      let slotEnd = parseTimeToMinutes(slot.end_time);
      if (slotStart === null || slotEnd === null) return false;
      if (slotEnd <= slotStart) slotEnd += 24 * 60;
      return shiftStart >= slotStart && shiftEnd <= slotEnd;
    });
    if (!isWithin) {
      const label = translations[state.language]["rota.conflictAvailability"] || "Outside availability";
      addWarning(shift.id, "availability", label, "warning");
    }
  });

  state.rotaConflicts = { map: warnings, list: conflictList };
}

function getDayIndex(dateValue) {
  const date = new Date(`${dateValue}T00:00:00`);
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

function getDayLabel(index) {
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels[index] || "--";
}

function isDateBetween(value, start, end) {
  return value >= start && value <= end;
}

function shiftsOverlap(a, b) {
  const startA = parseTimeToMinutes(a.start_time);
  let endA = parseTimeToMinutes(a.end_time);
  const startB = parseTimeToMinutes(b.start_time);
  let endB = parseTimeToMinutes(b.end_time);
  if (startA === null || endA === null || startB === null || endB === null) return false;
  if (endA <= startA) endA += 24 * 60;
  if (endB <= startB) endB += 24 * 60;
  return startA < endB && startB < endA;
}

function getWeekEndDate(weekStart) {
  if (!weekStart) return "";
  const date = new Date(`${weekStart}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().split("T")[0];
}

async function addAvailabilityRule() {
  const userId = document.getElementById("availability-user").value;
  const day = document.getElementById("availability-day").value;
  const start = document.getElementById("availability-start").value;
  const end = document.getElementById("availability-end").value;
  if (!userId || !start || !end) return;
  try {
    const rule = await apiFetch("/availability", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        day_of_week: Number(day),
        start_time: start,
        end_time: end,
        is_available: true
      })
    });
    state.availability = [...state.availability, rule];
    document.getElementById("availability-start").value = "";
    document.getElementById("availability-end").value = "";
    renderAvailabilityList();
    computeRotaConflicts();
    renderRotaGrid();
    renderConflictList();
  } catch (err) {
    alert(err.message);
  }
}

async function removeAvailabilityRule(ruleId) {
  try {
    await apiFetch(`/availability/${ruleId}`, { method: "DELETE" });
    state.availability = state.availability.filter((rule) => rule.id !== ruleId);
    renderAvailabilityList();
    computeRotaConflicts();
    renderRotaGrid();
    renderConflictList();
  } catch (err) {
    alert(err.message);
  }
}

async function requestTimeOff() {
  const userId = document.getElementById("timeoff-user").value;
  const start = document.getElementById("timeoff-start").value;
  const end = document.getElementById("timeoff-end").value;
  const reason = document.getElementById("timeoff-reason").value.trim();
  if (!userId || !start || !end) return;
  try {
    const record = await apiFetch("/time-off", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        start_date: start,
        end_date: end,
        reason
      })
    });
    state.timeOff = [record, ...state.timeOff];
    document.getElementById("timeoff-start").value = "";
    document.getElementById("timeoff-end").value = "";
    document.getElementById("timeoff-reason").value = "";
    renderTimeOffList();
    computeRotaConflicts();
    renderRotaGrid();
    renderConflictList();
  } catch (err) {
    alert(err.message);
  }
}

async function updateTimeOff(recordId, status) {
  try {
    await apiFetch(`/time-off/${recordId}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    });
    state.timeOff = state.timeOff.map((record) =>
      record.id === recordId ? { ...record, status } : record
    );
    renderTimeOffList();
    computeRotaConflicts();
    renderRotaGrid();
    renderConflictList();
  } catch (err) {
    alert(err.message);
  }
}

async function saveTemplateFromWeek() {
  const name = document.getElementById("rota-template-name").value.trim();
  if (!name) return alert("Template name required.");
  const includeAssignments = document.getElementById("rota-template-include").checked;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  const status = document.getElementById("rota-tools-status");
  const shifts = (state.rota.shifts || []).map((shift) => ({
    day_of_week: getDayIndex(shift.date),
    start_time: shift.start_time,
    end_time: shift.end_time,
    role: shift.role,
    notes: shift.notes,
    assigned_user_id: includeAssignments ? shift.assigned_user_id : null,
    location: shift.location,
    department: shift.department
  }));
  try {
    await apiFetch("/rota/templates", {
      method: "POST",
      body: JSON.stringify({ name, location, department, shifts })
    });
    document.getElementById("rota-template-name").value = "";
    state.rotaTemplates = await apiFetch(`/rota/templates?location=${encodeURIComponent(location)}&department=${encodeURIComponent(department)}`);
    renderRotaTemplates();
    if (status) status.textContent = translations[state.language]["rota.templateSaved"] || "Template saved.";
  } catch (err) {
    if (status) {
      status.textContent = err.message;
    } else {
      alert(err.message);
    }
  }
}

async function applySelectedTemplate() {
  const templateId = document.getElementById("rota-template-select").value;
  const weekStart = document.getElementById("rota-template-week").value || state.rota.weekStart;
  if (!templateId || !weekStart) return;
  const includeAssignments = document.getElementById("rota-template-apply-include").checked;
  const overwrite = document.getElementById("rota-template-overwrite").checked;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  const status = document.getElementById("rota-tools-status");
  try {
    await apiFetch(`/rota/templates/${templateId}/apply`, {
      method: "POST",
      body: JSON.stringify({ week_start: weekStart, include_assignments: includeAssignments, overwrite, location, department })
    });
    if (status) status.textContent = translations[state.language]["rota.templateApplied"] || "Template applied.";
    await loadRota();
  } catch (err) {
    if (status) {
      status.textContent = err.message;
    } else {
      alert(err.message);
    }
  }
}

async function deleteSelectedTemplate() {
  const templateId = document.getElementById("rota-template-select").value;
  if (!templateId) return;
  if (!confirm("Delete template?")) return;
  const status = document.getElementById("rota-tools-status");
  try {
    await apiFetch(`/rota/templates/${templateId}`, { method: "DELETE" });
    state.rotaTemplates = state.rotaTemplates.filter((template) => template.id !== templateId);
    renderRotaTemplates();
    if (status) status.textContent = translations[state.language]["rota.templateDeleted"] || "Template deleted.";
  } catch (err) {
    if (status) {
      status.textContent = err.message;
    } else {
      alert(err.message);
    }
  }
}

async function copyWeekShifts() {
  const fromWeek = state.rota.weekStart;
  const toWeek = document.getElementById("rota-copy-week").value;
  const repeat = Math.max(1, Number(document.getElementById("rota-copy-repeat").value || 1));
  const includeAssignments = document.getElementById("rota-copy-include").checked;
  const overwrite = document.getElementById("rota-copy-overwrite").checked;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  const status = document.getElementById("rota-tools-status");
  if (!fromWeek || !toWeek) return alert("Select target week.");
  try {
    await apiFetch("/rota/weeks/copy", {
      method: "POST",
      body: JSON.stringify({
        from_week_start: fromWeek,
        to_week_start: toWeek,
        repeat_weeks: repeat,
        include_assignments: includeAssignments,
        overwrite,
        location,
        department
      })
    });
    if (status) status.textContent = translations[state.language]["rota.copyDone"] || "Week copied.";
    await loadRota();
  } catch (err) {
    if (status) {
      status.textContent = err.message;
    } else {
      alert(err.message);
    }
  }
}

function toggleNotifyModal(show) {
  const modal = document.getElementById("rota-notify-modal");
  const status = document.getElementById("rota-notify-status");
  if (!modal) return;
  if (show) {
    if (status) status.textContent = "";
    modal.classList.add("active");
  } else {
    modal.classList.remove("active");
  }
}

async function sendRotaNotifications() {
  const weekStart = state.rota.weekStart;
  const location = document.getElementById("rota-location-filter").value.trim();
  const department = document.getElementById("rota-department-filter").value.trim();
  const status = document.getElementById("rota-notify-status");
  if (!weekStart) return;
  try {
    await apiFetch(`/rota/weeks/${weekStart}/notify`, {
      method: "POST",
      body: JSON.stringify({ location, department })
    });
    if (status) status.textContent = translations[state.language]["rota.notifySent"] || "Notifications sent.";
    setTimeout(() => toggleNotifyModal(false), 1200);
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

function renderStaffList() {
  const container = document.getElementById("rota-staff");
  container.innerHTML = "";
  const locationFilter = document.getElementById("rota-location-filter").value.trim();
  const departmentFilter = document.getElementById("rota-department-filter").value.trim();
  const search = (document.getElementById("rota-search")?.value || "").trim().toLowerCase();
  const filtered = state.staff.filter((user) => {
    if (!userMatchesScope(user, locationFilter, departmentFilter)) return false;
    if (!search) return true;
    const label = `${user.name || ""} ${user.email || ""} ${user.role || ""}`.toLowerCase();
    return label.includes(search);
  });
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
  const canManage = state.user && (state.user.role === "admin" || state.user.role === "manager");
  const filteredShifts = filterRotaShifts(state.rota.shifts || []);
  const days = getWeekDays(state.rota.weekStart);
  const timeRange = getRotaTimeRange(filteredShifts);
  const scaleMeta = getRotaTimeScaleMeta(timeRange);
  days.forEach((date) => {
    const day = document.createElement("div");
    day.className = "rota-day";
    day.dataset.date = date;
    if (canManage) {
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
    const shifts = filteredShifts.filter((shift) => shift.date === date).sort(sortShiftsByTime);
    const header = document.createElement("div");
    header.className = "rota-day-header";
    const title = document.createElement("h4");
    title.textContent = formatDayLabel(date);
    const meta = document.createElement("div");
    meta.className = "hint";
    const dayMinutes = shifts.reduce((acc, shift) => acc + getShiftMinutes(shift), 0);
    meta.textContent = shifts.length ? `${formatHours(dayMinutes)} · ${shifts.length}` : "--";
    header.appendChild(title);
    header.appendChild(meta);
    day.appendChild(header);

    const scale = document.createElement("div");
    scale.className = "rota-time-scale";
    scale.style.gridTemplateColumns = `repeat(${scaleMeta.labels.length}, 1fr)`;
    scaleMeta.labels.forEach((label) => {
      const tick = document.createElement("span");
      tick.textContent = label;
      scale.appendChild(tick);
    });
    day.appendChild(scale);

    const timeline = document.createElement("div");
    timeline.className = "rota-timeline";
    if (!shifts.length) {
      const empty = document.createElement("div");
      empty.className = "hint";
      empty.textContent = "--";
      timeline.appendChild(empty);
    }
    shifts.forEach((shift) => {
      const lane = document.createElement("div");
      lane.className = "rota-lane";

      const label = document.createElement("div");
      label.className = "rota-lane-label";
      const titleLine = document.createElement("div");
      titleLine.className = "rota-lane-title";
      const roleLabel = shift.role ? ` · ${shift.role}` : "";
      titleLine.textContent = `${resolveUserName(shift.assigned_user_id)}${roleLabel}`;
      label.appendChild(titleLine);
      const warnings = (state.rotaConflicts.map && state.rotaConflicts.map[shift.id]) || [];
      if (warnings.length) {
        const warningTag = document.createElement("div");
        warningTag.className = "warning-tag";
        warningTag.textContent = warnings[0].message;
        label.appendChild(warningTag);
      }
      if (shift.notes) {
        const noteLine = document.createElement("div");
        noteLine.textContent = shift.notes;
        label.appendChild(noteLine);
      }
      if (canManage) {
        const actions = document.createElement("div");
        actions.className = "rota-lane-actions";
        const editBtn = document.createElement("button");
        editBtn.className = "btn";
        editBtn.textContent = translations[state.language]["rota.edit"] || "Edit";
        editBtn.addEventListener("click", () => setRotaEdit(shift));
        const copyBtn = document.createElement("button");
        copyBtn.className = "btn";
        copyBtn.textContent = translations[state.language]["rota.copy"] || "Copy";
        copyBtn.addEventListener("click", () => copyShift(shift));
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn danger";
        removeBtn.textContent = translations[state.language]["rota.remove"] || "Remove";
        removeBtn.addEventListener("click", () => deleteShift(shift.id));
        actions.appendChild(editBtn);
        actions.appendChild(copyBtn);
        actions.appendChild(removeBtn);
        label.appendChild(actions);
      }

      const track = document.createElement("div");
      track.className = "rota-track";
      const gridOverlay = document.createElement("div");
      gridOverlay.className = "rota-track-grid";
      gridOverlay.style.gridTemplateColumns = `repeat(${scaleMeta.tickCount}, 1fr)`;
      for (let i = 0; i < scaleMeta.tickCount; i += 1) {
        const tick = document.createElement("span");
        gridOverlay.appendChild(tick);
      }
      track.appendChild(gridOverlay);

      const metrics = getShiftBarMetrics(shift, timeRange);
      const bar = document.createElement("div");
      bar.className = "rota-bar";
      if (!shift.assigned_user_id) bar.classList.add("unassigned");
      if (metrics.clipped) bar.classList.add("clipped");
      if (state.rota.editing && state.rota.editing.id === shift.id) {
        bar.classList.add("editing");
      }
      if (warnings.length) {
        const severity = warnings.some((warning) => warning.severity === "danger") ? "danger" : "warning";
        bar.classList.add(severity);
        bar.title = warnings.map((warning) => warning.message).join("\n");
      }
      bar.style.left = `${metrics.left}%`;
      bar.style.width = `${metrics.width}%`;
      bar.textContent = `${shift.start_time} - ${shift.end_time}`;
      if (canManage) {
        bar.draggable = true;
        bar.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("text/shift-id", shift.id);
        });
        bar.addEventListener("click", () => setRotaEdit(shift));
      }
      bar.addEventListener("dragover", (event) => {
        event.preventDefault();
        bar.classList.add("drag-over");
      });
      bar.addEventListener("dragleave", () => bar.classList.remove("drag-over"));
      bar.addEventListener("drop", (event) => {
        event.preventDefault();
        bar.classList.remove("drag-over");
        const userId = event.dataTransfer.getData("text/user-id");
        if (userId) assignShift(shift.id, userId);
      });

      if (canManage) {
        track.addEventListener("dragover", (event) => {
          event.preventDefault();
          track.classList.add("drag-over");
        });
        track.addEventListener("dragleave", () => track.classList.remove("drag-over"));
        track.addEventListener("drop", (event) => {
          event.preventDefault();
          track.classList.remove("drag-over");
          const userId = event.dataTransfer.getData("text/user-id");
          if (userId) assignShift(shift.id, userId);
        });
      }

      track.appendChild(bar);
      lane.appendChild(label);
      lane.appendChild(track);
      timeline.appendChild(lane);
    });

    day.appendChild(timeline);
    grid.appendChild(day);
  });
}

function sortShiftsByTime(a, b) {
  const startA = parseTimeToMinutes(a.start_time) || 0;
  const startB = parseTimeToMinutes(b.start_time) || 0;
  if (startA !== startB) return startA - startB;
  const endA = parseTimeToMinutes(a.end_time) || 0;
  const endB = parseTimeToMinutes(b.end_time) || 0;
  return endA - endB;
}

function getRotaFilters() {
  return {
    search: (document.getElementById("rota-search")?.value || "").trim().toLowerCase(),
    role: document.getElementById("rota-role-filter")?.value || ""
  };
}

function filterRotaShifts(shifts) {
  const { search, role } = getRotaFilters();
  return shifts.filter((shift) => {
    if (role && shift.role !== role) return false;
    if (!search) return true;
    const unassignedLabel = translations[state.language]["rota.unassigned"] || "Unassigned";
    const userLabel = (shift.assigned_user_id ? getUserDisplayName(shift.assigned_user_id) : unassignedLabel).toLowerCase();
    const roleLabel = (shift.role || "").toLowerCase();
    const notesLabel = (shift.notes || "").toLowerCase();
    return userLabel.includes(search) || roleLabel.includes(search) || notesLabel.includes(search);
  });
}

function renderRotaRoleFilter() {
  const select = document.getElementById("rota-role-filter");
  if (!select) return;
  const current = select.value;
  const roles = Array.from(new Set((state.rota.shifts || []).map((shift) => shift.role).filter(Boolean))).sort();
  select.innerHTML = "";
  const all = document.createElement("option");
  all.value = "";
  all.textContent = translations[state.language]["rota.allRoles"] || "All roles";
  select.appendChild(all);
  roles.forEach((role) => {
    const opt = document.createElement("option");
    opt.value = role;
    opt.textContent = role;
    select.appendChild(opt);
  });
  if (current && roles.includes(current)) {
    select.value = current;
  }
}

function renderUnassignedShifts() {
  const container = document.getElementById("rota-unassigned");
  if (!container) return;
  if (!state.user || (state.user.role !== "admin" && state.user.role !== "manager")) {
    container.textContent = "--";
    return;
  }
  const shifts = filterRotaShifts(state.rota.shifts || []).filter((shift) => !shift.assigned_user_id);
  container.innerHTML = "";
  if (!shifts.length) {
    container.textContent = "--";
    return;
  }
  shifts.forEach((shift) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const duration = formatHours(getShiftMinutes(shift));
    item.textContent = `${formatDayLabel(shift.date)} | ${shift.start_time}-${shift.end_time} (${duration}) ${shift.role || ""}`.trim();
    item.addEventListener("click", () => setRotaEdit(shift));
    container.appendChild(item);
  });
}

function parseTimeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = value.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function getRotaTimeRange(shifts) {
  const defaultStart = 6 * 60;
  const defaultEnd = 22 * 60;
  if (!shifts.length) {
    return { start: defaultStart, end: defaultEnd };
  }
  let min = defaultStart;
  let max = defaultEnd;
  shifts.forEach((shift) => {
    const start = parseTimeToMinutes(shift.start_time);
    let end = parseTimeToMinutes(shift.end_time);
    if (start === null || end === null) return;
    if (end <= start) end += 24 * 60;
    if (start < min) min = start;
    if (end > max) max = end;
  });
  min = Math.max(0, Math.floor(min / 60) * 60);
  max = Math.min(24 * 60, Math.ceil(max / 60) * 60);
  if (max - min < 2 * 60) {
    max = Math.min(24 * 60, min + 2 * 60);
  }
  return { start: min, end: max };
}

function getRotaTimeScaleMeta(range) {
  const totalHours = Math.max(1, Math.round((range.end - range.start) / 60));
  const step = totalHours <= 12 ? 2 : 4;
  const labels = [];
  for (let hour = range.start / 60; hour <= range.end / 60; hour += step) {
    labels.push(formatHourLabel(hour));
  }
  const tickCount = Math.max(1, labels.length - 1);
  return { labels, tickCount, range };
}

function formatHourLabel(hour) {
  const normalized = ((Math.round(hour) % 24) + 24) % 24;
  return `${String(normalized).padStart(2, "0")}:00`;
}

function getShiftBarMetrics(shift, range) {
  const start = parseTimeToMinutes(shift.start_time);
  let end = parseTimeToMinutes(shift.end_time);
  if (start === null || end === null) {
    return { left: 0, width: 100, clipped: false };
  }
  if (end <= start) end += 24 * 60;
  const durationRange = Math.max(1, range.end - range.start);
  const clampedStart = Math.min(range.end, Math.max(range.start, start));
  const clampedEnd = Math.min(range.end, Math.max(range.start, end));
  const left = ((clampedStart - range.start) / durationRange) * 100;
  const width = Math.max(2, ((clampedEnd - clampedStart) / durationRange) * 100);
  const clipped = start < range.start || end > range.end;
  return { left, width, clipped };
}

function resolveUserName(userId) {
  const unassignedLabel = translations[state.language]["rota.unassigned"] || "Unassigned";
  const youLabel = translations[state.language]["rota.you"] || "You";
  const unknownLabel = translations[state.language]["rota.unknown"] || "Unknown";
  if (!userId) return unassignedLabel;
  if (state.user && userId === state.user.id) return youLabel;
  const label = getUserDisplayName(userId);
  return label || unknownLabel;
}

function getUserDisplayName(userId) {
  if (!userId) return "";
  if (state.user && userId === state.user.id) {
    return state.user.name || state.user.email || "";
  }
  const user = state.staff.find((u) => u.id === userId) || state.users.find((u) => u.id === userId);
  return user ? (user.name || user.email) : "";
}

function populateAssignDropdown() {
  const select = document.getElementById("rota-assign");
  select.innerHTML = "";
  const locationFilter = document.getElementById("rota-location-filter").value.trim();
  const departmentFilter = document.getElementById("rota-department-filter").value.trim();
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = translations[state.language]["rota.unassigned"] || "Unassigned";
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

function isScopeAllowed(location, department) {
  if (!state.user) return false;
  if (state.user.role === "admin") return true;
  const scopes = state.user.scopes && state.user.scopes.length
    ? state.user.scopes
    : [{ location: state.user.location, department: state.user.department }];
  return scopes.some((scope) => scope.location === location && scope.department === department);
}

async function addShift() {
  const date = document.getElementById("rota-date").value;
  const start = document.getElementById("rota-start").value;
  const end = document.getElementById("rota-end").value;
  const role = document.getElementById("rota-role").value;
  const location = document.getElementById("rota-location").value;
  const department = document.getElementById("rota-department").value;
  const locationScope = document.getElementById("rota-location-filter").value.trim();
  const departmentScope = document.getElementById("rota-department-filter").value.trim();
  const locationValue = locationScope || location;
  const departmentValue = departmentScope || department;
  const notes = document.getElementById("rota-notes").value;
  const assigned = document.getElementById("rota-assign").value;
  if (!date || !start || !end) return alert("Date, start, and end are required.");
  if (state.user && state.user.role === "admin" && (!locationValue || !departmentValue)) {
    return alert("Select location and department.");
  }
  if (!isScopeAllowed(locationValue, departmentValue)) {
    return alert("Selected scope not allowed.");
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
        department: departmentValue,
        notes,
        assigned_user_id: assigned || null
      })
    });
    clearRotaEdit();
    await loadRota();
  } catch (err) {
    alert(err.message);
  }
}

function setRotaEdit(shift) {
  state.rota.editing = shift;
  document.getElementById("rota-date").value = shift.date;
  document.getElementById("rota-start").value = shift.start_time;
  document.getElementById("rota-end").value = shift.end_time;
  document.getElementById("rota-role").value = shift.role || "";
  document.getElementById("rota-notes").value = shift.notes || "";
  document.getElementById("rota-assign").value = shift.assigned_user_id || "";
  const locationSelect = document.getElementById("rota-location");
  const departmentSelect = document.getElementById("rota-department");
  if (locationSelect) locationSelect.value = shift.location || "";
  if (departmentSelect) departmentSelect.value = shift.department || "";
  const addBtn = document.getElementById("rota-add");
  const updateBtn = document.getElementById("rota-update");
  const cancelBtn = document.getElementById("rota-cancel");
  if (addBtn) addBtn.style.display = "none";
  if (updateBtn) updateBtn.style.display = "inline-flex";
  if (cancelBtn) cancelBtn.style.display = "inline-flex";
  const hint = document.getElementById("rota-edit-hint");
  if (hint) {
    hint.textContent = `${translations[state.language]["rota.editing"] || "Editing"}: ${shift.date} ${shift.start_time}-${shift.end_time}`;
  }
}

function clearRotaEdit() {
  state.rota.editing = null;
  const addBtn = document.getElementById("rota-add");
  const updateBtn = document.getElementById("rota-update");
  const cancelBtn = document.getElementById("rota-cancel");
  if (addBtn) addBtn.style.display = "inline-flex";
  if (updateBtn) updateBtn.style.display = "none";
  if (cancelBtn) cancelBtn.style.display = "none";
  const hint = document.getElementById("rota-edit-hint");
  if (hint) hint.textContent = "";
  document.getElementById("rota-start").value = "";
  document.getElementById("rota-end").value = "";
  document.getElementById("rota-role").value = "";
  document.getElementById("rota-notes").value = "";
  document.getElementById("rota-assign").value = "";
  const locationScope = document.getElementById("rota-location-filter").value.trim();
  const departmentScope = document.getElementById("rota-department-filter").value.trim();
  if (locationScope) document.getElementById("rota-location").value = locationScope;
  if (departmentScope) document.getElementById("rota-department").value = departmentScope;
}

async function updateShift() {
  if (!state.rota.editing) return;
  const shiftId = state.rota.editing.id;
  const date = document.getElementById("rota-date").value;
  const start = document.getElementById("rota-start").value;
  const end = document.getElementById("rota-end").value;
  const role = document.getElementById("rota-role").value;
  const location = document.getElementById("rota-location").value;
  const department = document.getElementById("rota-department").value;
  const locationScope = document.getElementById("rota-location-filter").value.trim();
  const departmentScope = document.getElementById("rota-department-filter").value.trim();
  const locationValue = locationScope || location;
  const departmentValue = departmentScope || department;
  const notes = document.getElementById("rota-notes").value;
  const assigned = document.getElementById("rota-assign").value;
  if (!date || !start || !end) return alert("Date, start, and end are required.");
  if (state.user && state.user.role === "admin" && (!locationValue || !departmentValue)) {
    return alert("Select location and department.");
  }
  if (!isScopeAllowed(locationValue, departmentValue)) {
    return alert("Selected scope not allowed.");
  }
  try {
    await apiFetch(`/rota/shifts/${shiftId}`, {
      method: "PATCH",
      body: JSON.stringify({
        date,
        start_time: start,
        end_time: end,
        role,
        location: locationValue,
        department: departmentValue,
        notes,
        assigned_user_id: assigned || null
      })
    });
    clearRotaEdit();
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
  if (!isScopeAllowed(location, department)) {
    return alert("Selected scope not allowed.");
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
  if (!isScopeAllowed(location, department)) {
    return alert("Selected scope not allowed.");
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
  if (!isScopeAllowed(location, department)) {
    return alert("Selected scope not allowed.");
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

function shiftRotaWeek(offsetDays) {
  const input = document.getElementById("rota-week");
  if (!input || !input.value) return;
  const date = new Date(`${input.value}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  input.value = date.toISOString().split("T")[0];
  loadRota();
}

function setRotaWeekToToday() {
  const input = document.getElementById("rota-week");
  if (!input) return;
  const monday = getWeekStartDate(new Date());
  input.value = monday;
  loadRota();
}

function getWeekDays(weekStart) {
  const base = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 7 }, (_, idx) => {
    const day = new Date(base);
    day.setDate(base.getDate() + idx);
    return day.toISOString().split("T")[0];
  });
}

function getShiftMinutes(shift) {
  if (!shift.start_time || !shift.end_time) return 0;
  const start = new Date(`1970-01-01T${shift.start_time}`);
  const end = new Date(`1970-01-01T${shift.end_time}`);
  let diff = (end - start) / 60000;
  if (diff < 0) diff += 24 * 60;
  diff = Math.max(0, diff);
  return Math.round(diff);
}

function formatHours(minutes) {
  const hours = minutes / 60;
  return `${Math.round(hours * 10) / 10}h`;
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
  initMyReport();
  initGeo();
  initProfile();
  initInvites();
  initPolicies();
  startLiveClock();
  updateUserUI();
  bootstrap();
}

function startLiveClock() {
  updateLiveClock();
  if (liveClockTimer) clearInterval(liveClockTimer);
  liveClockTimer = setInterval(updateLiveClock, 1000);
}

function applyRoleVisibility() {
  const reportsTab = document.querySelector('[data-view="reports"]');
  const profileTab = document.querySelector('[data-view="profile"]');
  const adminTab = document.querySelector('[data-view="admin"]');
  const canViewReports = state.user && (state.user.role === "admin" || state.user.role === "manager");
  const canManageRota = state.user && (state.user.role === "admin" || state.user.role === "manager");
  const isAdmin = state.user && state.user.role === "admin";
  if (reportsTab) {
    reportsTab.style.display = canViewReports ? "inline-flex" : "none";
  }
  if (profileTab) {
    profileTab.style.display = state.user ? "inline-flex" : "none";
  }
  if (adminTab) {
    adminTab.style.display = isAdmin ? "inline-flex" : "none";
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
    "rota-editor-card",
    "rota-staff-card",
    "rota-unassigned-card",
    "rota-tools-card",
    "rota-conflicts-card",
    "rota-publish",
    "rota-unpublish",
    "rota-remind-checkin",
    "rota-remind-checkout",
    "rota-notify",
    "rota-add",
    "rota-update",
    "rota-cancel"
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
    header.className = "item-header";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = user.name || user.email;
    header.appendChild(title);
    header.appendChild(createStatusBadge(user.is_active ? "active" : "archived"));
    item.appendChild(header);
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${user.email} · ${user.role} · ${user.location || "-"} / ${user.department || "-"}`;
    item.appendChild(meta);
    const scopes = (user.scopes || []).map((scope) => `${scope.location}/${scope.department}`).join(", ");
    if (scopes) {
      const scopeLine = document.createElement("div");
      scopeLine.className = "item-meta";
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

function renderDirectories() {
  renderDirectoryList("locations", "location-list");
  renderDirectoryList("departments", "department-list");
}

function renderDirectoryList(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const items = (state.settings.directories && state.settings.directories[type]) || [];
  if (!items.length) {
    container.textContent = "--";
    return;
  }
  items.forEach((value) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const label = document.createElement("div");
    label.className = "item-title";
    label.textContent = value;
    const actions = document.createElement("div");
    actions.className = "button-row";
    const remove = document.createElement("button");
    remove.className = "btn danger";
    remove.textContent = translations[state.language]["rota.remove"] || "Remove";
    remove.addEventListener("click", () => removeDirectoryItem(type, value));
    actions.appendChild(remove);
    item.appendChild(label);
    item.appendChild(actions);
    container.appendChild(item);
  });
}

function addDirectoryItem(type) {
  const inputId = type === "locations" ? "dir-location" : "dir-department";
  const input = document.getElementById(inputId);
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;
  const list = (state.settings.directories && state.settings.directories[type]) || [];
  if (!list.includes(value)) {
    list.push(value);
  }
  state.settings.directories[type] = list;
  input.value = "";
  renderDirectories();
  populateDirectoryOptions();
}

function removeDirectoryItem(type, value) {
  const list = (state.settings.directories && state.settings.directories[type]) || [];
  state.settings.directories[type] = list.filter((item) => item !== value);
  renderDirectories();
  populateDirectoryOptions();
}

function populateDirectoryOptions() {
  const locations = (state.settings.directories && state.settings.directories.locations) || [];
  const departments = (state.settings.directories && state.settings.directories.departments) || [];
  populateSelect("user-location", locations, true);
  populateSelect("user-department", departments, true);
  populateSelect("rota-location", locations, true);
  populateSelect("rota-department", departments, true);
  populateSelect("rota-location-filter", getRotaLocations(locations), true);
  populateSelect("rota-department-filter", getRotaDepartments(departments), true);
  populateSelect("invite-location", locations, true);
  populateSelect("invite-department", departments, true);
}

function populateSelect(id, options, includeBlank) {
  const select = document.getElementById(id);
  if (!select) return;
  const current = select.value;
  select.innerHTML = "";
  if (includeBlank) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "--";
    select.appendChild(empty);
  }
  options.forEach((value) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
  });
  if (current) select.value = current;
}

function getRotaLocations(defaultList) {
  const list = new Set(defaultList);
  if (state.user && state.user.scopes && state.user.scopes.length) {
    state.user.scopes.forEach((scope) => list.add(scope.location));
  }
  if (state.user && state.user.role !== "admin" && state.user.scopes && state.user.scopes.length) {
    return Array.from(new Set(state.user.scopes.map((scope) => scope.location)));
  }
  return Array.from(list);
}

function getRotaDepartments(defaultList) {
  const list = new Set(defaultList);
  if (state.user && state.user.scopes && state.user.scopes.length) {
    state.user.scopes.forEach((scope) => list.add(scope.department));
  }
  if (state.user && state.user.role !== "admin" && state.user.scopes && state.user.scopes.length) {
    return Array.from(new Set(state.user.scopes.map((scope) => scope.department)));
  }
  return Array.from(list);
}

function renderProfile() {
  const data = state.profile.data || {};
  const emailInput = document.getElementById("profile-email");
  if (emailInput) emailInput.value = state.profile.email || (state.user ? state.user.email : "");
  const setValue = (id, value) => {
    const input = document.getElementById(id);
    if (input) input.value = value || "";
  };
  setValue("profile-full-name", data.full_name);
  setValue("profile-preferred-name", data.preferred_name);
  setValue("profile-phone", data.phone);
  setValue("profile-birth", data.birth_date);
  setValue("profile-tax-id", data.tax_id);
  setValue("profile-ssn", data.social_security_number);
  setValue("profile-address", data.address);
  setValue("profile-postal", data.postal_code);
  setValue("profile-city", data.city);
  setValue("profile-province", data.province);
  setValue("profile-country", data.country);
  setValue("profile-employee-id", data.employee_id);
  setValue("profile-job-title", data.job_title);
  setValue("profile-start-date", data.start_date);
  setValue("profile-iban", data.iban);
  setValue("profile-emergency-name", data.emergency_contact_name);
  setValue("profile-emergency-phone", data.emergency_contact_phone);
}

async function saveProfile() {
  const payload = {
    full_name: document.getElementById("profile-full-name").value.trim(),
    preferred_name: document.getElementById("profile-preferred-name").value.trim(),
    phone: document.getElementById("profile-phone").value.trim(),
    birth_date: document.getElementById("profile-birth").value.trim(),
    tax_id: document.getElementById("profile-tax-id").value.trim(),
    social_security_number: document.getElementById("profile-ssn").value.trim(),
    address: document.getElementById("profile-address").value.trim(),
    postal_code: document.getElementById("profile-postal").value.trim(),
    city: document.getElementById("profile-city").value.trim(),
    province: document.getElementById("profile-province").value.trim(),
    country: document.getElementById("profile-country").value.trim(),
    employee_id: document.getElementById("profile-employee-id").value.trim(),
    job_title: document.getElementById("profile-job-title").value.trim(),
    start_date: document.getElementById("profile-start-date").value.trim(),
    iban: document.getElementById("profile-iban").value.trim(),
    emergency_contact_name: document.getElementById("profile-emergency-name").value.trim(),
    emergency_contact_phone: document.getElementById("profile-emergency-phone").value.trim()
  };
  const status = document.getElementById("profile-status");
  try {
    await apiFetch("/profile", {
      method: "PUT",
      body: JSON.stringify({ profile: payload })
    });
    state.profile.data = payload;
    if (state.user && (payload.full_name || payload.preferred_name)) {
      state.user.name = payload.full_name || payload.preferred_name;
      save(STORAGE_KEYS.user, state.user);
      updateUserUI();
    }
    if (status) status.textContent = translations[state.language]["profile.saved"] || "Profile saved.";
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

async function uploadSelfie() {
  const fileInput = document.getElementById("selfie-file");
  const status = document.getElementById("selfie-status");
  if (!fileInput || !fileInput.files[0]) {
    if (status) status.textContent = translations[state.language]["profile.selfieMissing"] || "Select an image.";
    return;
  }
  const form = new FormData();
  form.append("selfie", fileInput.files[0]);
  try {
    const response = await fetch(`${API_BASE}/profile/selfie`, {
      method: "POST",
      headers: { Authorization: `Bearer ${state.token}` },
      body: form
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(error.error || "Upload failed");
    }
    const payload = await response.json().catch(() => ({}));
    if (payload.selfie_uploaded_at) {
      state.profile.selfieUploadedAt = payload.selfie_uploaded_at;
    }
    if (status) status.textContent = translations[state.language]["profile.selfieSaved"] || "Selfie updated.";
    fileInput.value = "";
    loadSelfiePreview();
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

async function loadSelfiePreview() {
  const img = document.getElementById("selfie-preview");
  if (!img) return;
  if (!state.profile.selfieUploadedAt) {
    img.removeAttribute("src");
    return;
  }
  try {
    const blob = await apiFetchBlob("/profile/selfie", { method: "GET" });
    if (state.profile.selfieUrl) URL.revokeObjectURL(state.profile.selfieUrl);
    const url = URL.createObjectURL(blob);
    state.profile.selfieUrl = url;
    img.src = url;
  } catch (err) {
    img.removeAttribute("src");
  }
}

function renderInvites() {
  const list = document.getElementById("invite-list");
  if (!list) return;
  list.innerHTML = "";
  if (!state.user || state.user.role !== "admin") {
    list.textContent = "--";
    return;
  }
  if (!state.invites.length) {
    list.textContent = "--";
    return;
  }
  state.invites.forEach((invite) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const header = document.createElement("div");
    header.className = "item-header";
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = invite.email || "(no email)";
    header.appendChild(title);
    header.appendChild(createStatusBadge(invite.status));
    item.appendChild(header);
    const scope = [invite.location, invite.department].filter(Boolean).join(" / ") || "--";
    const meta = document.createElement("div");
    meta.className = "item-meta";
    meta.textContent = `${invite.role} · ${scope}`;
    item.appendChild(meta);
    if (invite.link) {
      const link = document.createElement("div");
      link.className = "item-meta";
      link.textContent = invite.link;
      item.appendChild(link);
    }
    const actions = document.createElement("div");
    actions.className = "button-row";
    if (invite.link) {
      const copy = document.createElement("button");
      copy.className = "btn";
      copy.textContent = translations[state.language]["admin.inviteCopy"] || "Copy link";
      copy.addEventListener("click", () => copyInviteLink(invite.link));
      actions.appendChild(copy);
    }
    if (invite.status === "pending") {
      const revoke = document.createElement("button");
      revoke.className = "btn danger";
      revoke.textContent = translations[state.language]["admin.inviteRevoke"] || "Revoke";
      revoke.addEventListener("click", () => revokeInvite(invite.id));
      actions.appendChild(revoke);
    }
    if (actions.children.length) item.appendChild(actions);
    list.appendChild(item);
  });
}

function updateInviteScopeVisibility() {
  const roleSelect = document.getElementById("invite-role");
  const locationSelect = document.getElementById("invite-location");
  const departmentSelect = document.getElementById("invite-department");
  if (!roleSelect || !locationSelect || !departmentSelect) return;
  const isAdmin = roleSelect.value === "admin";
  locationSelect.disabled = isAdmin;
  departmentSelect.disabled = isAdmin;
  if (isAdmin) {
    locationSelect.value = "";
    departmentSelect.value = "";
  }
}

async function createInvite() {
  const email = document.getElementById("invite-email").value.trim();
  const role = document.getElementById("invite-role").value;
  const location = document.getElementById("invite-location").value.trim();
  const department = document.getElementById("invite-department").value.trim();
  const expiry = document.getElementById("invite-expiry").value;
  const status = document.getElementById("invite-link");
  try {
    const result = await apiFetch("/invites", {
      method: "POST",
      body: JSON.stringify({
        email,
        role,
        location,
        department,
        expires_in_days: expiry
      })
    });
    if (status) {
      status.textContent = result.link
        ? `${translations[state.language]["admin.inviteLink"] || "Invite link"}: ${result.link}`
        : translations[state.language]["admin.inviteCreated"] || "Invite created.";
    }
    document.getElementById("invite-email").value = "";
    state.invites = await apiFetch("/invites");
    renderInvites();
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

async function revokeInvite(id) {
  try {
    await apiFetch(`/invites/${id}/revoke`, { method: "POST" });
    state.invites = await apiFetch("/invites");
    renderInvites();
  } catch (err) {
    // ignore
  }
}

function copyInviteLink(link) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).catch(() => {
      window.prompt("Copy invite link", link);
    });
  } else {
    window.prompt("Copy invite link", link);
  }
}

function initSignaturePad() {
  const canvas = document.getElementById("signature-pad");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width;
  const height = rect.height || canvas.height;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.strokeStyle = "#1a1e1b";
  ctx.lineWidth = 2;
  signatureState = { hasStroke: false, canvas, ctx };
  let drawing = false;
  const getPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };
  canvas.addEventListener("pointerdown", (event) => {
    drawing = true;
    signatureState.hasStroke = true;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!drawing) return;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  });
  const endStroke = () => {
    drawing = false;
  };
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointerleave", endStroke);
}

function resizeSignaturePad() {
  if (!signatureState.canvas || !signatureState.ctx) return;
  const ratio = window.devicePixelRatio || 1;
  const rect = signatureState.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  signatureState.canvas.width = rect.width * ratio;
  signatureState.canvas.height = rect.height * ratio;
  signatureState.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  signatureState.ctx.strokeStyle = "#1a1e1b";
  signatureState.ctx.lineWidth = 2;
}

function clearSignaturePad() {
  if (!signatureState.canvas || !signatureState.ctx) return;
  signatureState.ctx.clearRect(0, 0, signatureState.canvas.width, signatureState.canvas.height);
  signatureState.hasStroke = false;
  const status = document.getElementById("signature-status");
  if (status) status.textContent = "";
}

async function signMonthlyReport() {
  const month = document.getElementById("my-report-month").value;
  const status = document.getElementById("signature-status");
  if (!month) {
    if (status) status.textContent = translations[state.language]["myReport.missingMonth"] || "Select a month.";
    return;
  }
  if (!signatureState.hasStroke) {
    if (status) status.textContent = translations[state.language]["myReport.signatureRequired"] || "Signature required.";
    return;
  }
  const signerName = (state.profile.data && (state.profile.data.full_name || state.profile.data.preferred_name)) ||
    (state.user ? state.user.name : "");
  try {
    await apiFetch("/reports/monthly/sign", {
      method: "POST",
      body: JSON.stringify({
        month,
        signature: signatureState.canvas.toDataURL("image/png"),
        signer_name: signerName
      })
    });
    if (status) status.textContent = translations[state.language]["myReport.signed"] || "Signed.";
    loadMyMonthlyReport();
  } catch (err) {
    if (status) status.textContent = err.message;
  }
}

async function loadMyMonthlyReport() {
  const monthInput = document.getElementById("my-report-month");
  if (!monthInput || !monthInput.value) return;
  try {
    const data = await apiFetch(`/reports/monthly/self?month=${monthInput.value}`);
    state.monthly.my = data;
    renderMyMonthlyReport();
  } catch (err) {
    const status = document.getElementById("my-report-status");
    if (status) status.textContent = err.message;
  }
}

function renderMyMonthlyReport() {
  const summary = document.getElementById("my-report-summary");
  const status = document.getElementById("my-report-status");
  if (!summary || !state.monthly.my) return;
  const totals = state.monthly.my.totals || {};
  summary.textContent = `${translations[state.language]["myReport.days"] || "Days"}: ${totals.days || 0} | ${translations[state.language]["myReport.hours"] || "Hours"}: ${totals.total_hours || 0} | ${translations[state.language]["myReport.breaks"] || "Breaks"}: ${totals.break_minutes || 0} min`;
  if (status) {
    status.textContent = state.monthly.my.signed_at
      ? `${translations[state.language]["myReport.signedAt"] || "Signed at"}: ${state.monthly.my.signed_at}`
      : translations[state.language]["myReport.notSigned"] || "Not signed";
  }
}

async function downloadMyMonthlyReport() {
  const monthInput = document.getElementById("my-report-month");
  if (!monthInput || !monthInput.value) return;
  try {
    const blob = await apiFetchBlob(`/reports/monthly/self/pdf?month=${monthInput.value}`, { method: "GET" });
    downloadBlob(`monthly-report-${monthInput.value}.pdf`, blob);
  } catch (err) {
    const status = document.getElementById("my-report-status");
    if (status) status.textContent = err.message;
  }
}

async function loadMonthlyReports() {
  const monthInput = document.getElementById("monthly-report-month");
  if (!monthInput || !monthInput.value) return;
  if (!state.user || (state.user.role !== "admin" && state.user.role !== "manager")) return;
  try {
    state.monthly.list = await apiFetch(`/reports/monthly?month=${monthInput.value}`);
    renderMonthlyReportList(monthInput.value);
  } catch (err) {
    const list = document.getElementById("monthly-report-list");
    if (list) list.textContent = err.message;
  }
}

function renderMonthlyReportList(month) {
  const list = document.getElementById("monthly-report-list");
  if (!list) return;
  list.innerHTML = "";
  if (!state.monthly.list || !state.monthly.list.length) {
    list.textContent = "--";
    return;
  }
  state.monthly.list.forEach((row) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const header = document.createElement("div");
    const statusLabel = row.signed_at
      ? translations[state.language]["myReport.signed"] || "Signed"
      : translations[state.language]["myReport.notSigned"] || "Pending";
    header.textContent = `${row.name} | ${row.totals.total_hours || 0}h | ${statusLabel}`;
    item.appendChild(header);
    const actions = document.createElement("div");
    actions.className = "button-row";
    const download = document.createElement("button");
    download.className = "btn";
    download.textContent = translations[state.language]["reports.downloadMonthly"] || "Download PDF";
    download.addEventListener("click", () => downloadMonthlyReport(row.user_id, month));
    actions.appendChild(download);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

async function downloadMonthlyReport(userId, month) {
  try {
    const blob = await apiFetchBlob(`/reports/monthly/${userId}/pdf?month=${month}`, { method: "GET" });
    downloadBlob(`monthly-report-${month}-${userId}.pdf`, blob);
  } catch (err) {
    // ignore
  }
}

function ensureGeoMap() {
  if (!document.getElementById("geo-map")) return;
  if (state.geo.map) {
    setTimeout(() => state.geo.map.invalidateSize(), 200);
    return;
  }
  if (!window.L) return;
  const map = window.L.map("geo-map").setView([37.74, -0.87], 10);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  state.geo.map = map;
}

async function populateGeoUsers() {
  const field = document.querySelector(".geo-user-field");
  const select = document.getElementById("geo-user");
  if (!field || !select) return;
  const canViewAll = state.user && (state.user.role === "admin" || state.user.role === "manager");
  field.style.display = canViewAll ? "flex" : "none";
  if (!canViewAll) return;
  let users = state.user && state.user.role === "admin" ? state.users : state.staff;
  if ((!users || !users.length) && state.user && state.user.role === "manager") {
    try {
      users = await apiFetch("/staff");
      state.staff = users;
    } catch (err) {
      users = [];
    }
  }
  select.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = translations[state.language]["geo.allUsers"] || "All";
  select.appendChild(empty);
  (users || []).forEach((user) => {
    const opt = document.createElement("option");
    opt.value = user.id;
    opt.textContent = user.name || user.email;
    select.appendChild(opt);
  });
}

async function loadGeoEvents() {
  const from = document.getElementById("geo-from").value;
  const to = document.getElementById("geo-to").value;
  const type = document.getElementById("geo-type").value;
  const userId = document.getElementById("geo-user").value;
  const params = new URLSearchParams();
  if (from) params.append("from", from);
  if (to) params.append("to", to);
  if (type) params.append("type", type);
  if (userId) params.append("user_id", userId);
  try {
    state.geo.events = await apiFetch(`/geo/events?${params.toString()}`);
    renderGeoList();
    renderGeoMarkers();
  } catch (err) {
    const list = document.getElementById("geo-list");
    if (list) list.textContent = err.message;
  }
}

function renderGeoList() {
  const list = document.getElementById("geo-list");
  if (!list) return;
  list.innerHTML = "";
  if (!state.geo.events.length) {
    list.textContent = "--";
    return;
  }
  state.geo.events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const userLabel = event.name || event.email || "--";
    item.textContent = `${new Date(event.timestamp).toLocaleString()} | ${event.event_type} | ${userLabel}`;
    list.appendChild(item);
  });
}

function renderGeoMarkers() {
  if (!state.geo.map || !window.L) return;
  state.geo.markers.forEach((marker) => state.geo.map.removeLayer(marker));
  state.geo.markers = [];
  const bounds = [];
  state.geo.events.forEach((event) => {
    if (!event.latitude || !event.longitude) return;
    const marker = window.L.marker([event.latitude, event.longitude]);
    const userLabel = event.name || event.email || "--";
    marker.bindPopup(`${userLabel}<br>${event.event_type}<br>${new Date(event.timestamp).toLocaleString()}`);
    marker.addTo(state.geo.map);
    state.geo.markers.push(marker);
    bounds.push([event.latitude, event.longitude]);
  });
  if (bounds.length) {
    state.geo.map.fitBounds(bounds, { padding: [20, 20] });
  }
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
