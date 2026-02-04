# TORRE TEMPO - FRONTEND (apps/web/src)

**Updated:** 2026-02-04  
**Status:** 🚧 Core UI Complete (~50%), Time Tracking/Scheduling Placeholders  
**Stack:** React 18 + TypeScript + Vite + Zustand + i18next

---

## OVERVIEW

React SPA with PWA capabilities, multi-tenant routing, i18n (es/en), version-based cache busting.

---

## STRUCTURE

```
src/
├── components/       # Reusable UI (Button, Card, Modal, etc.)
├── pages/            # Route-level components (lazy-loaded)
├── hooks/            # Custom React hooks (useAuth, useTenant, etc.)
├── services/         # API clients (axios wrappers)
├── stores/           # Zustand state (auth, tenant, UI)
├── contexts/         # React contexts (TenantContext)
├── locales/          # i18n JSON files (en/, es/)
├── i18n/             # i18next configuration
├── types/            # TypeScript interfaces
├── utils/            # Pure functions, helpers
├── styles/           # Global CSS, Tailwind config
├── main.tsx          # React bootstrap + service worker registration
└── App.tsx           # Router + TenantProvider + lazy routes
```

---

## WHERE TO LOOK

| Task                   | Location                          | Notes                                    |
| ---------------------- | --------------------------------- | ---------------------------------------- |
| **Add new page**       | `pages/`, `App.tsx`               | Lazy-load with React.lazy()              |
| **API calls**          | `services/api.ts`                 | Axios instance with tenant context       |
| **Auth logic**         | `stores/authStore.ts`             | Zustand store, JWT handling              |
| **Tenant context**     | `contexts/TenantContext.tsx`      | Extracts tenant slug from URL path       |
| **Protected routes**   | `components/ProtectedRoute.tsx`   | Redirects to login if unauthenticated    |
| **i18n translations**  | `locales/{lang}/translation.json` | Nested keys, use `t('key.subkey')`       |
| **Cache busting**      | `main.tsx`                        | Compares APP_VERSION, clears on mismatch |
| **Service worker**     | `public/service-worker.js`        | Network-first, registered in production  |
| **Push notifications** | `main.tsx`                        | OneSignal initialization                 |
| **Global state**       | `stores/`                         | Zustand stores (auth, tenant, UI)        |
| **Type definitions**   | `types/`                          | Shared interfaces (User, Employee, etc.) |
| **Vite config**        | `vite.config.ts` (parent dir)     | Path alias `@/` → `./src/`               |

---

## CONVENTIONS

### Routing & Lazy Loading

- **All pages lazy-loaded:** `const Dashboard = lazy(() => import('./pages/Dashboard'));`
- **Suspense wrapper:** `<Suspense fallback={<LoadingSpinner />}>`
- **Protected routes:** Wrap with `<ProtectedRoute>` for auth-required pages
- **Tenant routing:** Paths prefixed with `/t/:tenantSlug/` (extracted by TenantContext)

### State Management

- **Zustand stores:** One store per domain (auth, tenant, UI)
- **No Redux:** Zustand for simplicity, Context for tenant isolation
- **Persist auth:** `authStore` persists to localStorage (JWT tokens)

### API Calls

- **Axios instance:** `services/api.ts` with interceptors for auth + tenant headers
- **Tenant header:** `X-Tenant-Slug` injected from TenantContext
- **Error handling:** Centralized in axios interceptor, shows toast on 401/403

### i18n

- **Language detection:** User preference → localStorage → browser default → 'es'
- **Translation keys:** Nested JSON, use `t('employees.form.firstName')`
- **Language switcher:** Available in header + profile settings

### Cache Busting

- **Version check:** `main.tsx` compares `APP_VERSION` (from env) with localStorage
- **Force clear:** On version mismatch, clears localStorage + caches, reloads page
- **Current version:** `v5.9.0` (update in `.env` on releases)

---

## ANTI-PATTERNS (FRONTEND-SPECIFIC)

### NEVER DO

- ❌ **Hardcode tenant slug:** Always use `useTenant()` hook
- ❌ **Skip lazy loading:** All pages MUST be lazy-loaded (performance)
- ❌ **Hardcode strings:** All user-facing text in `locales/` files
- ❌ **Direct localStorage access:** Use Zustand persist middleware
- ❌ **Bypass ProtectedRoute:** Auth-required pages MUST be wrapped
- ❌ **Ignore cache busting:** Update `APP_VERSION` on every release
- ❌ **Fetch without tenant context:** API calls MUST include tenant header
- ❌ **Inline styles:** Use Tailwind classes, avoid `style={{...}}`
- ❌ **Mutate Zustand state:** Use `set()` function, never direct mutation

---

## NOTES

- **PWA manifest:** `public/manifest.json` (icons, theme color, display mode)
- **Service worker:** Only registered in production (`import.meta.env.PROD`)
- **Vite proxy:** `/api` → `http://localhost:3000` (dev only)
- **OneSignal:** Push notifications initialized in `main.tsx` (app ID from env)
- **Path alias:** `@/` resolves to `./src/` (configured in `vite.config.ts`)
