# TORRE TEMPO - PROJECT KNOWLEDGE BASE

**Updated:** 2026-02-02  
**Status:** 🚧 Early Development (Foundation Complete ~40%)  
**Project:** Multi-Tenant SaaS Time Tracking & Scheduling System

---

## 🎯 ACTUAL IMPLEMENTATION STATUS

### ✅ COMPLETE (Working & Deployed)

- **Database Schema:** 100% complete Prisma schema with all models (TimeEntry, Employee, Schedule, etc.)
- **Backend Core (~30%):** Authentication + Employee Management REST API
  - `auth.routes.ts` - Login, register, refresh tokens
  - `employee.routes.ts` - Full CRUD with role-based filtering
  - Middleware: JWT auth, RBAC (isAdminOrManager)
- **Frontend Core (~50%):** React SPA with core UI
  - Dashboard, Login, Employees, Profile, Settings pages (FUNCTIONAL)
  - i18n (Spanish/English), PWA manifest, Zustand store
  - Employee management UI with CRUD operations

### 🚧 IN PROGRESS (Placeholders Only)

- **Time Tracking:** Schema ✅, Backend ❌, Frontend placeholder "Coming Soon"
- **Scheduling:** Schema ✅, Backend ❌, Frontend placeholder "Coming Soon"
- **Leave Requests:** Schema ✅, Backend ❌, Frontend placeholder "Coming Soon"

### ❌ NOT STARTED

- Mobile app (React Native) - empty placeholder
- Reporting & exports
- Add-on modules (advanced scheduling, compliance pack, etc.)

### 🔥 IMMEDIATE PRIORITIES

1. **Time Tracking Implementation** - Clock in/out with geolocation (NEXT TASK)
2. Scheduling module (Deputy-style drag-drop calendar)
3. Leave request workflow

---

## OVERVIEW

Torre Tempo is a production-grade, multi-tenant SaaS time tracking system designed for Spanish compliance (RDL 8/2019, GDPR/LOPDGDD). Primary market: hospitality sector. Core product + 7 modular paid add-ons. Event-driven geolocation, immutable audit trails, Deputy-style scheduling.

**Tech Stack:** Node.js 20 + TypeScript 5 | Express 4 | PostgreSQL 15 | Redis | React 18 + Vite | React Native + Expo

---

## STRUCTURE

```
Torre-Tempo/
├── apps/
│   ├── api/          # Backend REST API (Express + TypeScript)
│   ├── web/          # Tenant-facing SPA (React + TypeScript)
│   └── mobile/       # Mobile app (React Native + Expo)
├── docs/             # ✅ Authoritative specs (READ FIRST)
│   ├── spec.md       # 🔒 LOCKED - Final product spec
│   ├── api-contract.md
│   ├── data-model.md
│   ├── compliance.md
│   └── permissions.md
├── nginx/            # Reverse proxy config
└── scripts/          # Build/deploy automation
```

**⚠️ CRITICAL:** `docs/spec.md` is LOCKED and authoritative. All implementation decisions defer to this spec unless explicitly overridden by product owner.

---

## WHERE TO LOOK

| Task                     | Location               | Notes                                |
| ------------------------ | ---------------------- | ------------------------------------ |
| **Product requirements** | `docs/spec.md`         | LOCKED spec - read first             |
| **API design**           | `docs/api-contract.md` | REST endpoints, auth, error handling |
| **Database schema**      | `docs/data-model.md`   | PostgreSQL schema, RLS policies      |
| **GDPR/labor law**       | `docs/compliance.md`   | Spanish compliance requirements      |
| **Permissions model**    | `docs/permissions.md`  | RBAC definitions                     |
| **Backend API**          | `apps/api/`            | When implemented: Express routes     |
| **Frontend**             | `apps/web/`            | When implemented: React SPA          |
| **Mobile**               | `apps/mobile/`         | When implemented: React Native       |

---

## ARCHITECTURE PRINCIPLES

### Multi-Tenancy (Non-Negotiable)

- **Path-based:** `https://torretempo.com/t/{tenantSlug}/...`
- **Tenant isolation:** Row-level security (PostgreSQL RLS) + logical partitioning
- **No per-tenant code:** All configuration via UI/database
- **Tenant context:** Extracted from URL path, validated by middleware, injected into request

### Compliance First (Blocking)

- **Immutable audit:** Append-only time entries, corrections tracked separately
- **Event-only geo:** GPS captured ONLY on clock in/out, never continuous
- **4-year retention:** Automatic enforcement, soft deletes only
- **Signed exports:** Digital signatures for labor inspection (add-on module)

### Security (Non-Negotiable)

- **JWT auth:** Short-lived access tokens + refresh tokens
- **MFA:** TOTP via speakeasy (optional per tenant)
- **Row-level security:** PostgreSQL RLS enforces tenant isolation at DB level
- **Encrypted at rest:** PII fields (tax_id, phone) encrypted in DB

---

## CONVENTIONS

### File Organization

```
apps/api/src/
├── middleware/       # Auth, tenant context, rate limiting
├── routes/           # Express route handlers (resource-based)
│   ├── auth.ts
│   ├── employees.ts
│   └── time-entries.ts
├── services/         # Business logic (tenant-scoped)
├── repositories/     # Data access layer (Prisma/TypeORM)
├── validators/       # Zod schemas for request validation
├── utils/            # Pure functions, helpers
└── types/            # TypeScript interfaces/types

apps/web/src/
├── components/       # Reusable UI components
├── pages/            # Route-level page components
├── hooks/            # Custom React hooks
├── services/         # API clients (axios/fetch)
├── store/            # State management (Context/Redux/Zustand)
├── utils/            # Pure functions
└── types/            # TypeScript types
```

### TypeScript Style

- **Strict mode:** `"strict": true` in tsconfig.json
- **No implicit any:** Explicit types always
- **Interfaces over types:** For object shapes (consistency)
- **Enums for constants:** Use string enums for status/roles
- **No `as any`:** NEVER suppress type errors
- **No `@ts-ignore`:** Fix the root cause, don't suppress

### Naming Conventions

- **Files:** kebab-case (`time-entry.service.ts`)
- **Classes:** PascalCase (`TimeEntryService`)
- **Functions/vars:** camelCase (`getTimeEntry`, `userId`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_OVERTIME_HOURS`)
- **Interfaces:** PascalCase with descriptive names (`TimeEntry`, not `ITimeEntry`)
- **Types:** PascalCase with `Type` suffix only if needed (`TenantSettingsType`)

### Import Order

```typescript
// 1. External libraries
import express from "express";
import { z } from "zod";

// 2. Internal modules (grouped)
import { getTenantById } from "@/services/tenant.service";
import { TimeEntryRepository } from "@/repositories/time-entry.repository";

// 3. Types
import type { Tenant, TimeEntry } from "@/types";

// 4. Relative imports last
import { validateRequest } from "../middleware/validator";
```

### Error Handling

- **API responses:** Always use standardized error format (see `api-contract.md`)
- **Try-catch:** Wrap async operations, propagate with context
- **Logging:** Winston/Pino for structured logs (include `tenantId`, `userId`, `requestId`)
- **Validation errors:** Return 400 with Zod error details
- **Auth errors:** Return 401 (unauthenticated) or 403 (forbidden)
- **Not found:** Return 404 with resource type

```typescript
// Good
try {
  const timeEntry = await timeEntryRepo.findById(id, tenantId);
  if (!timeEntry) {
    return res
      .status(404)
      .json({ error: "Time entry not found", code: "TIME_ENTRY_NOT_FOUND" });
  }
} catch (error) {
  logger.error("Failed to fetch time entry", { error, tenantId, entryId: id });
  return res.status(500).json({ error: "Internal server error" });
}
```

### Database Access

- **Tenant-scoped queries:** ALWAYS filter by `tenant_id`
- **No raw SQL:** Use ORM (Prisma/TypeORM) except for complex analytics
- **Transactions:** Use for multi-step operations (clock in + geolocation insert)
- **Soft deletes:** Use `deleted_at` timestamp, never hard delete
- **Timestamps:** `created_at`, `updated_at` on all tables

---

## ANTI-PATTERNS (THIS PROJECT)

### NEVER DO

- ❌ **Skip tenant validation:** Every query MUST filter by tenant_id
- ❌ **Continuous geolocation:** Only capture GPS on clock in/out events
- ❌ **Edit time entries:** Append-only model, corrections tracked separately
- ❌ **Hard deletes:** Always soft delete with `deleted_at`
- ❌ **Per-tenant code changes:** Everything configurable via database
- ❌ **Expose tenant_id in URLs:** Use tenant slug only
- ❌ **Store PII in logs:** Redact DNI/NIE, tax IDs, phone numbers
- ❌ **Type suppression:** No `as any`, `@ts-ignore`, `@ts-expect-error`

### COMPLIANCE VIOLATIONS (Blocking)

- ❌ **Missing audit trail:** Every change logged with user, timestamp, reason
- ❌ **Pre-4-year deletion:** Data must be retained for 4 years minimum
- ❌ **Unsigned exports:** Labor inspection exports require digital signatures (paid add-on)
- ❌ **GDPR violations:** See `docs/compliance.md` for full requirements

---

## COMMANDS

**⚠️ TO BE IMPLEMENTED** (Project is in planning phase)

### Backend (apps/api)

```bash
# Install
npm install

# Development
npm run dev                    # Start dev server with hot reload

# Testing
npm test                       # Run all tests
npm test -- TimeEntry          # Run single test file
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report

# Linting
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix issues
npm run format                 # Prettier format

# Build
npm run build                  # TypeScript compile
npm start                      # Production server
```

### Frontend (apps/web)

```bash
# Install
npm install

# Development
npm run dev                    # Vite dev server

# Testing
npm test                       # Jest + React Testing Library
npm run test:e2e               # Playwright E2E tests

# Build
npm run build                  # Production build
npm run preview                # Preview production build
```

### Mobile (apps/mobile)

```bash
# Install
npm install

# Development
npm start                      # Expo dev server
npm run ios                    # iOS simulator
npm run android                # Android emulator

# Build
npm run build:ios              # iOS build
npm run build:android          # Android APK
```

---

## DEVELOPMENT WORKFLOW

### Getting Started

1. **Read specs:** `docs/spec.md` (LOCKED), `docs/api-contract.md`, `docs/data-model.md`
2. **Understand multi-tenancy:** Path-based routing, tenant middleware
3. **Review compliance:** `docs/compliance.md` - Spanish labor law is non-negotiable
4. **Check permissions:** `docs/permissions.md` - RBAC model

### Feature Implementation

1. **Check spec first:** Is it in `docs/spec.md`? Follow exactly.
2. **Database changes:** Update Prisma schema, create migration
3. **Backend:** Service layer (business logic) → Repository (data access) → Route (HTTP)
4. **Validation:** Zod schema for request body validation
5. **Testing:** Unit tests for services, integration tests for endpoints
6. **Frontend:** API client → React hook → Component

### Testing Requirements

- **Unit tests:** All services and utilities (90% coverage target)
- **Integration tests:** API endpoints with test database
- **E2E tests:** Critical user flows (clock in/out, leave requests)
- **Tenant isolation tests:** Verify no cross-tenant data leakage

---

## INTERNATIONALIZATION (i18n)

### Supported Languages

- **English (en)** - Default
- **Spanish (es)** - Primary market

### Backend i18n

- **Library:** i18next
- **Translation files:** `apps/api/src/locales/{lang}/translation.json`
- **Email templates:** `apps/api/src/templates/emails/{lang}/{template}.html`
- **User language:** Stored in `users.preferredLanguage` column (default: 'es')
- **Detection:** JWT token contains `language` claim, fallback to user's profile setting

### Frontend i18n

- **Library:** react-i18next
- **Translation files:** `apps/web/src/locales/{lang}/translation.json`
- **Language switcher:** Available in user profile and header
- **Persistence:** Language stored in localStorage + user profile
- **SSR consideration:** Language detected from user preferences

### Translation Conventions

- **Keys:** Nested JSON structure using dot notation
  - Example: `employees.form.firstName`, `common.save`, `errors.required`
- **Plurals:** Use i18next plural syntax: `key`, `key_plural`
- **Interpolation:** Use `{{variable}}` for dynamic values
- **Never hardcode strings:** All user-facing text must be in translation files

### Email Templates

- **Location:** `apps/api/src/templates/emails/{lang}/{template}.html`
- **Templates:**
  - `welcome.html` - New employee welcome email with credentials
  - `password-reset.html` - Password reset link
  - `shift-assigned.html` - Shift assignment notification
  - `leave-approved.html` - Leave request approved
  - `leave-rejected.html` - Leave request rejected
- **Variables:** Use `{{variable}}` syntax (Handlebars/Mustache compatible)

---

## BRANDING & DESIGN

### Logo & Visual Identity

- **Brand Name:** Torre Tempo
- **Color Scheme:**
  - Primary: Gradient `#6366f1` (indigo) → `#8b5cf6` (purple)
  - Secondary: `#1e293b` (dark slate)
  - Accent: `#f59e0b` (amber)
- **Logo:** Modern, professional design representing time management + hospitality
- **Typography:** System fonts (-apple-system, Segoe UI, Roboto)

### Copyright & Attribution

All pages must include footer:

```
© {year} Lakeside La Torre (Murcia) Group SL
Designed and Developed by John McBride
```

### PWA (Progressive Web App)

**CRITICAL:** Torre Tempo must be a fully functional PWA for all devices.

#### Requirements

- **Mobile-First:** All UI/UX must be optimized for mobile devices
- **Responsive:** Seamless experience on phone, tablet, desktop
- **Offline-Capable:** Service worker for offline access (future enhancement)
- **Installable:** Add to home screen functionality
- **Performance:** Fast loading, smooth animations on mobile

#### Implementation

- **Manifest:** `public/manifest.json` with app metadata
- **Icons:** Multiple sizes (192x192, 512x512) for different devices
- **Service Worker:** Cache static assets for offline access
- **Meta Tags:** Proper viewport, theme-color, apple-touch-icon

#### Mobile UI/UX Priorities

1. **Touch-Friendly:** All buttons minimum 44px tap target
2. **Thumb-Reachable:** Critical actions in bottom navigation
3. **Fast:** < 3s initial load on 3G networks
4. **Readable:** Minimum 16px font size, high contrast
5. **Gesture-Friendly:** Swipe actions where appropriate

---

## EMAIL SYSTEM (SMTP)

### Configuration

- **Library:** Nodemailer
- **SMTP Provider:** Configurable via environment variables (works with any provider)
- **Environment variables:**
  ```env
  SMTP_HOST=smtp.example.com
  SMTP_PORT=587
  SMTP_SECURE=false
  SMTP_USER=your-email@example.com
  SMTP_PASS=your-password
  SMTP_FROM_NAME=Torre Tempo
  SMTP_FROM_EMAIL=noreply@torretempo.com
  ```

### Supported SMTP Providers

- Gmail SMTP (smtp.gmail.com:587)
- SendGrid (smtp.sendgrid.net:587)
- Amazon SES (email-smtp.{region}.amazonaws.com:587)
- Mailgun (smtp.mailgun.org:587)
- Custom SMTP servers

### Email Service Architecture

- **Service:** `apps/api/src/services/email.service.ts`
- **Template rendering:** Handlebars for HTML email templates
- **Queue:** BullMQ for async email sending (prevents blocking requests)
- **Retry logic:** 3 attempts with exponential backoff
- **Logging:** All emails logged with status (sent/failed/queued)

### Email Triggers

- **Employee created:** Welcome email with login credentials
- **Shift assigned:** Notification to employee
- **Leave request submitted:** Notification to manager
- **Leave request approved/rejected:** Notification to employee
- **Password reset:** Reset link email
- **Clock in/out anomaly:** Alert to manager (optional)

### User Language Preference

- **Default language:** Spanish (es) for new users
- **User can change:** Via profile settings
- **Emails sent in:** User's preferred language
- **Fallback:** If template not found in user's language, use Spanish

---

## NOTES

### Current State (2026-02-01)

- **Status:** Greenfield project, planning phase complete
- **Codebase:** Empty placeholder structure
- **Documentation:** ✅ Comprehensive specs in `docs/`
- **Next steps:** Begin backend API implementation per `api-contract.md`

### Key Dependencies

- PostgreSQL 15+ required (RLS support)
- Node.js 20 LTS
- Redis for caching + BullMQ job queue

### Monorepo Strategy

- Three apps: api, web, mobile
- Shared types package (to be created)
- Shared validation schemas (to be created)
- Consider using Turborepo or Nx for build orchestration

### Multi-Tenant Testing

- Test with multiple tenants in parallel
- Verify tenant context injection in all routes
- Test PostgreSQL RLS policies enforce isolation
- Test tenant slug edge cases (special chars, collisions)

### Compliance Testing

- Geolocation: Verify event-only capture, no continuous tracking
- Audit trail: Verify immutability, correction workflow
- Retention: Test 4-year enforcement, soft delete only
- Exports: Test signed PDF generation (when add-on implemented)

---

**Questions?** Refer to `docs/spec.md` (authoritative), then `api-contract.md`, `data-model.md`. Ambiguities: ask product owner, do NOT assume.
