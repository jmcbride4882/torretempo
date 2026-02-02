import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { initializeAuth } from "./stores/authStore";
import "./i18n/config";
import "./index.css";

// Initialize auth state from localStorage
initializeAuth();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// ============================================================================
// NUCLEAR CACHE CLEARING - Version 3.1.0 (2026-02-02 19:00)
// ============================================================================
const APP_VERSION = "3.1.0-20260202-1900";
const STORED_VERSION = localStorage.getItem("app_version");

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  TORRE TEMPO v${APP_VERSION}  ║
║  Mobile Week Grid Fix - Portrait Mode                         ║
╚════════════════════════════════════════════════════════════════╝
`);

// Force cache clear on version change
if (STORED_VERSION !== APP_VERSION) {
  console.warn(`🔄 VERSION MISMATCH: ${STORED_VERSION} → ${APP_VERSION}`);
  console.warn(`⚠️  FORCING COMPLETE CACHE CLEAR...`);

  // 1. Clear all caches
  if ("caches" in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
        console.log(`🗑️ Deleted cache: ${name}`);
      });
    });
  }

  // 2. Unregister ALL service workers
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister();
        console.warn("🗑️ Unregistered service worker:", registration.scope);
      });
    });
  }

  // 3. Update stored version
  localStorage.setItem("app_version", APP_VERSION);
  console.log(`✅ Updated app version to ${APP_VERSION}`);
  console.warn(`🔄 PLEASE RELOAD THE PAGE to complete update!`);
} else {
  console.log(`✅ App version up-to-date: ${APP_VERSION}`);
}

// Register new service worker (v3.0 - network-first strategy)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker v3 registered:", registration.scope);
      })
      .catch((error) => {
        console.error("❌ Service Worker registration failed:", error);
      });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
