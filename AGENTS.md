# AGENTS

This file gives agentic contributors a quick map of how to work in this repo.

## Repo overview
- Monorepo with API, web, and mobile apps.
- API: Node/Express + better-sqlite3 in `apps/api`.
- Web: static HTML/CSS/JS in `apps/web` (served by Docker web service).
- Mobile: Expo React Native app in `apps/mobile`.
- SQLite data lives under `./data` when using Docker.

## Rules discovered
- No Cursor rules found (`.cursor/rules` or `.cursorrules`).
- No Copilot instructions found (`.github/copilot-instructions.md`).

## Build and run
### Docker (preferred for full stack)
- Build and run: `docker compose up -d --build` (from repo root).
- Stop: `docker compose down`.
- API logs: `docker compose logs -f api`.
- Web is served at `http://<host>:8080`, API at `http://<host>:4000`.

### API (local)
- `cd apps/api`
- Install: `npm install`
- Run: `npm run start` (only script)
- Env vars are read from process env; Docker uses `.env` at repo root.
- JWT auth uses `Authorization: Bearer <token>`.

### Web (local)
- Static app, no build step.
- Open `apps/web/index.html` directly or serve with any static server.
- Cache-bust assets by bumping `?v=YYYYMMDD` in HTML.

### Mobile (Expo)
- `cd apps/mobile`
- Install: `npm install`
- Start: `npm run start`
- Android: `npm run android`
- iOS: `npm run ios`

## Lint and tests
- No lint or test scripts are defined in package.json.
- There is no configured single-test runner.
- If you add tests, update this file with exact commands (including single test).

## Environment configuration (common)
- `JWT_SECRET` and `PORT` control API auth and port.
- `DB_PATH`, `DB_IMPORT_PATH`, and `DB_MIGRATIONS_ENABLED` control SQLite storage.
- `AUTO_SEED_ADMIN`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` for bootstrap.
- `SELFIE_STORAGE_DIR`, `SIGNATURE_STORAGE_DIR`, `CERT_STORAGE_DIR` for uploads.
- `CERT_P12_PATH`, `CERT_P12_PASSWORD` for PDF signing.
- `UPDATE_SCRIPT_PATH` for self-update actions.
- `RESET_URL_BASE` for password reset links.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` for mail.

## Data and migrations
- Schema lives in `apps/api/schema.sql`.
- Startup migrations run when `DB_MIGRATIONS_ENABLED=true`.
- One-off migration script: `scripts/migrate-profile-invites-reports.js`.
- Self-update script: `scripts/self-update.sh`.
- VPS bootstrap script: `scripts/deploy-vps.sh`.

## Auth and roles
- Roles: `admin`, `manager`, `employee`.
- Admin-only endpoints check `requireRole(["admin"])`.
- Manager access mirrors admin for rota/reports; follow existing guards.
- Web stores token in localStorage key `tt_token`.

## Code style guidelines
### General
- 2-space indentation, semicolons, double quotes.
- Prefer `const`, use `let` only when needed.
- Keep functions small and focused; use early returns on validation.
- Favor readable names over abbreviations.
- Constants use `UPPER_SNAKE_CASE` (see `STORAGE_KEYS`).

### Naming conventions
- JS functions and variables: `camelCase`.
- CSS classes and DOM ids: `kebab-case`.
- DB columns: `snake_case`.

### API (Node/Express)
- CommonJS `require` imports; keep all imports at top.
- Use `async/await` + `try/catch` for IO paths.
- Return JSON for API responses: `res.json(...)` or `res.status(...).json({ error: ... })`.
- Use `requireAuth` and `requireRole` for auth and authorization.
- Record business events with `logAudit(userId, action, entityType, entityId, meta)`.
- Validate inputs before DB writes and return 400/403/404 appropriately.
- For internal errors, return 500 with a safe message (avoid leaking secrets).

### Database
- Use `db.prepare(...)` with parameters; avoid string interpolation.
- Use `nanoid()` for IDs (consistent with existing tables).
- Timestamps are ISO strings: `new Date().toISOString()`.

### Web (apps/web)
- No build tooling; keep plain JS and DOM manipulation.
- Use `apiFetch` or `apiFetchBlob` for API calls.
- Central app state lives in `state`; update it before calling render helpers.
- Localization: add strings to `apps/web/translations.js` and reference via `data-i18n`.
- Use `translations[state.language][key] || "Fallback"` for labels.
- For new UI controls, add translation keys for all locales (ES is default).
- Use `state.profile.selfieUploadedAt` to avoid selfie 404 noise.

### CSS and layout
- Use CSS variables in `:root` (tokens like `--accent`, `--surface`).
- Prefer existing class patterns instead of inline styles.
- Keep layout responsive; update media queries if you add new panels.
- If you touch styles, bump cache-bust query strings in HTML.

### Mobile (apps/mobile)
- ES module imports; React Native style.
- Use AsyncStorage keys defined in `STORAGE_KEYS`.
- API base is derived from `ENVIRONMENT_MAP` and normalized by `normalizeApiBase`.
- Keep components small; use helper functions for side effects.

## Error handling patterns
- Web: show errors in status labels or `alert()` when needed.
- API: return `{ error: "message" }` with proper HTTP status.
- Do not leak stack traces or secrets to clients.

## Exports and PDF signing
- PDF exports use `pdfkit` and `node-signpdf`.
- Company certificate (.p12/.pfx) required for inspectorate PDF exports.
- Upload certificate in Admin > Exports and Audit, stored in settings.

## Feature workflows
- Adding tables: update `apps/api/schema.sql`, `apps/api/db.js`, and any migration script.
- Adding endpoints: keep `/api/...` routes consistent, add auth guards.
- Adding UI sections: add nav item, view container, and translations.
- Selfie preview: only fetch when `selfie_uploaded_at` exists.

## Operational notes
- Docker web container builds from repo root and serves static files.
- API container mounts repo at `/repo` and data at `/data`.
- Use `scripts/self-update.sh` inside the container for automated updates.

## Reference files
- API entry: `apps/api/server.js`
- DB layer: `apps/api/db.js`
- Web UI: `apps/web/index.html`, `apps/web/app.js`, `apps/web/styles.css`
- Web translations: `apps/web/translations.js`
- Mobile app: `apps/mobile/App.js`
