const API_BASE = "/api";

function getLanguage() {
  return localStorage.getItem("tt_language") || "es-ES";
}

function setLanguage(lang) {
  localStorage.setItem("tt_language", lang);
  const dict = translations[lang] || translations["es-ES"];
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (dict[key]) node.textContent = dict[key];
  });
}

async function initSetup() {
  const status = await fetch(`${API_BASE}/setup/status`).then((res) => res.json()).catch(() => null);
  if (status && !status.needs_setup) {
    window.location.href = "/";
    return;
  }
}

function setMessage(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `reset-message ${type}`;
}

async function completeSetup() {
  const admin = {
    name: document.getElementById("setup-admin-name").value.trim(),
    email: document.getElementById("setup-admin-email").value.trim(),
    password: document.getElementById("setup-admin-password").value.trim(),
    location: document.getElementById("setup-admin-location").value.trim(),
    department: document.getElementById("setup-admin-department").value.trim()
  };
  const company = {
    controller_legal_name: document.getElementById("setup-company-name").value.trim(),
    controller_cif: document.getElementById("setup-company-cif").value.trim(),
    controller_address: document.getElementById("setup-company-address").value.trim(),
    controller_contact_email: document.getElementById("setup-company-email").value.trim(),
    controller_contact_phone: document.getElementById("setup-company-phone").value.trim()
  };
  if (!admin.email || !admin.password || !company.controller_legal_name) {
    setMessage("setup-message", getText("setup.required"), "error");
    return;
  }
  try {
    await fetch(`${API_BASE}/setup/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ admin, company })
    }).then((res) => {
      if (!res.ok) throw new Error("Setup failed");
      return res.json();
    });
    setMessage("setup-message", getText("setup.success"), "success");
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  } catch (err) {
    setMessage("setup-message", getText("setup.error"), "error");
  }
}

async function importDatabase() {
  const file = document.getElementById("setup-import-file").files[0];
  if (!file) {
    setMessage("import-message", getText("setup.importMissing"), "error");
    return;
  }
  const form = new FormData();
  form.append("database", file);
  try {
    await fetch(`${API_BASE}/setup/import`, {
      method: "POST",
      body: form
    }).then((res) => {
      if (!res.ok) throw new Error("Import failed");
      return res.json();
    });
    setMessage("import-message", getText("setup.importSuccess"), "success");
  } catch (err) {
    setMessage("import-message", getText("setup.importError"), "error");
  }
}

function getText(key) {
  const lang = getLanguage();
  const dict = translations[lang] || translations["es-ES"];
  return dict[key] || key;
}

function init() {
  const picker = document.getElementById("lang");
  picker.value = getLanguage();
  setLanguage(picker.value);
  picker.addEventListener("change", (event) => setLanguage(event.target.value));
  document.getElementById("setup-complete").addEventListener("click", completeSetup);
  document.getElementById("setup-import").addEventListener("click", importDatabase);
  initSetup();
}

document.addEventListener("DOMContentLoaded", init);
