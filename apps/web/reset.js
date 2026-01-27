const API_BASE = "/api";

const STORAGE_KEY = "tt_language";

function getLanguage() {
  return localStorage.getItem(STORAGE_KEY) || "es-ES";
}

function setLanguage(lang) {
  localStorage.setItem(STORAGE_KEY, lang);
  const dict = translations[lang] || translations["es-ES"];
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (dict[key]) node.textContent = dict[key];
  });
}

function initLanguagePicker() {
  const picker = document.getElementById("lang");
  picker.value = getLanguage();
  setLanguage(picker.value);
  picker.addEventListener("change", (event) => setLanguage(event.target.value));
}

function setMessage(text, type) {
  const message = document.getElementById("reset-message");
  message.textContent = text;
  message.className = `reset-message ${type}`;
}

async function resetPassword() {
  const token = document.getElementById("reset-token").value.trim();
  const password = document.getElementById("reset-password").value.trim();
  const confirm = document.getElementById("reset-confirm").value.trim();
  if (!token) {
    setMessage(getText("reset.missing"), "error");
    return;
  }
  if (!password || password !== confirm) {
    setMessage(getText("reset.error"), "error");
    return;
  }
  try {
    await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: password })
    }).then((res) => {
      if (!res.ok) throw new Error("Request failed");
      return res.json();
    });
    setMessage(getText("reset.success"), "success");
  } catch (err) {
    setMessage(getText("reset.error"), "error");
  }
}

function getText(key) {
  const lang = getLanguage();
  const dict = translations[lang] || translations["es-ES"];
  return dict[key] || key;
}

function initToken() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  document.getElementById("reset-token").value = token;
  if (!token) {
    setMessage(getText("reset.missing"), "error");
  }
}

function init() {
  initLanguagePicker();
  initToken();
  document.getElementById("reset-submit").addEventListener("click", resetPassword);
}

document.addEventListener("DOMContentLoaded", init);
