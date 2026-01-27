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

function setMessage(text, type) {
  const el = document.getElementById("signup-message");
  if (!el) return;
  el.textContent = text;
  el.className = `reset-message ${type}`;
}

function getText(key) {
  const lang = getLanguage();
  const dict = translations[lang] || translations["es-ES"];
  return dict[key] || key;
}

function getToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get("token") || "";
}

async function validateInvite(token) {
  try {
    const res = await fetch(`${API_BASE}/invites/validate?token=${encodeURIComponent(token)}`);
    if (!res.ok) throw new Error("Invalid invite");
    return res.json();
  } catch (err) {
    return null;
  }
}

function collectProfile() {
  return {
    full_name: document.getElementById("signup-full-name").value.trim(),
    preferred_name: document.getElementById("signup-preferred-name").value.trim(),
    phone: document.getElementById("signup-phone").value.trim(),
    birth_date: document.getElementById("signup-birth").value.trim(),
    tax_id: document.getElementById("signup-tax-id").value.trim(),
    social_security_number: document.getElementById("signup-ssn").value.trim(),
    address: document.getElementById("signup-address").value.trim(),
    postal_code: document.getElementById("signup-postal").value.trim(),
    city: document.getElementById("signup-city").value.trim(),
    province: document.getElementById("signup-province").value.trim(),
    country: document.getElementById("signup-country").value.trim(),
    employee_id: document.getElementById("signup-employee-id").value.trim(),
    job_title: document.getElementById("signup-job-title").value.trim(),
    start_date: document.getElementById("signup-start-date").value.trim(),
    iban: document.getElementById("signup-iban").value.trim(),
    emergency_contact_name: document.getElementById("signup-emergency-name").value.trim(),
    emergency_contact_phone: document.getElementById("signup-emergency-phone").value.trim()
  };
}

async function submitSignup() {
  const token = getToken();
  if (!token) {
    setMessage(getText("signup.missingToken"), "error");
    return;
  }
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value.trim();
  if (!email || !password) {
    setMessage(getText("signup.required"), "error");
    return;
  }
  try {
    const response = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        email,
        password,
        profile: collectProfile()
      })
    });
    if (!response.ok) throw new Error("Signup failed");
    setMessage(getText("signup.success"), "success");
    setTimeout(() => {
      window.location.href = "/";
    }, 1400);
  } catch (err) {
    setMessage(getText("signup.error"), "error");
  }
}

async function init() {
  const picker = document.getElementById("lang");
  picker.value = getLanguage();
  setLanguage(picker.value);
  picker.addEventListener("change", (event) => setLanguage(event.target.value));
  const token = getToken();
  if (!token) {
    setMessage(getText("signup.missingToken"), "error");
    return;
  }
  const invite = await validateInvite(token);
  if (!invite) {
    setMessage(getText("signup.invalidToken"), "error");
    return;
  }
  const emailInput = document.getElementById("signup-email");
  if (invite.email) {
    emailInput.value = invite.email;
    emailInput.disabled = true;
  }
  document.getElementById("signup-submit").addEventListener("click", submitSignup);
}

document.addEventListener("DOMContentLoaded", init);
