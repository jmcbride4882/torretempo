# Torre Tempo - Multi-Tenant SaaS Time Tracking System

**Status:** ✅ Repository scaffolded and ready for development  
**Date:** February 1, 2026  
**Tech Stack:** Node.js 20 + TypeScript | Express | PostgreSQL 15 | Redis | React 18 | React Native

---

## 🎯 Project Overview

Torre Tempo is a production-grade, multi-tenant SaaS time tracking and scheduling system designed specifically for **Spanish compliance** (Royal Decree-Law 8/2019, GDPR/LOPDGDD). Primary market: hospitality sector.

**Key Features:**
- ✅ Path-based multi-tenancy (`/t/{tenantSlug}/`)
- ✅ Event-only geolocation (clock in/out only)
- ✅ Immutable audit trails
- ✅ Deputy-style scheduling (paid add-on)
- ✅ Module-gated architecture (7 paid add-ons)

---

## 📁 Repository Structure

```
Torre-Tempo/
├── apps/
│   ├── api/              # Backend API (Express + TypeScript + Prisma)
│   │   ├── prisma/       # Database schema + migrations + seed
│   │   └── src/
│   │       ├── middleware/    # Tenant context, auth, module gating
│   │       ├── routes/        # Auth routes (more to be added)
│   │       ├── services/      # Business logic (AuthService)
│   │       ├── utils/         # Logger (Pino)
│   │       └── index.ts       # Express app bootstrap
│   ├── web/              # Frontend SPA (React + Vite + Zustand)
│   │   └── src/
│   │       └── stores/   # Zustand auth store
│   └── mobile/           # Mobile app (React Native + Expo)
├── docs/                 # ✅ Comprehensive specs (READ THESE FIRST)
│   ├── spec.md                    # 🔒 LOCKED product spec
│   ├── api-contract.md            # REST API design
│   ├── data-model.md              # PostgreSQL schema
│   ├── compliance.md              # Spanish labor law requirements
│   ├── permissions.md             # RBAC model
│   ├── scheduling-design.md       # Deputy-style scheduling spec
│   └── implementation-kickstart.md # This scaffolding guide
├── nginx/                # Reverse proxy config (TODO)
├── scripts/              # Build/deploy automation (TODO)
├── build.sh              # 🔧 Comprehensive build script
├── docker-compose.yml    # PostgreSQL + Redis for local dev
├── turbo.json            # Turborepo configuration
├── package.json          # Root workspace config
├── .env.example          # Environment variables template
└── .gitignore            # Git ignore rules
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20 LTS
- **PostgreSQL** 15+
- **Redis** 7+
- **Docker + Docker Compose** (recommended)

### 1. Clone and Setup

```bash
cd Torre-Tempo

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration (JWT secrets, etc.)
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL + Redis via Docker Compose
docker-compose up -d

# Wait for services to be ready (~5 seconds)
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Setup

```bash
cd apps/api

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with demo tenant + admin user
npm run db:seed
```

**Demo Credentials:**
- Email: `admin@torretempo.com`
- Password: `admin123`
- Tenant Slug: `demo`

### 5. Start Development

```bash
# From root directory
npm run dev
```

This starts:
- **API:** http://localhost:3000
- **Web:** http://localhost:5173

---

## 🔧 Build Script

We've created a comprehensive build script (`build.sh`) that handles everything:

```bash
# Full build (checks prerequisites, installs deps, migrates DB, runs tests, builds)
./build.sh

# Skip tests
./build.sh --skip-tests

# Skip Docker services (if running externally)
./build.sh --skip-docker

# Skip database seed
./build.sh --skip-seed

# View all options
./build.sh --help
```

**The build script will be kept up to date as the project evolves.**

---

## 📖 Key Documentation

| Document | Purpose |
|----------|---------|
| `docs/spec.md` | **START HERE** - Locked product specification |
| `docs/implementation-kickstart.md` | How this repo was scaffolded |
| `docs/api-contract.md` | REST API endpoints + auth |
| `docs/data-model.md` | Complete PostgreSQL schema |
| `docs/scheduling-design.md` | Deputy-style scheduling spec |
| `docs/compliance.md` | Spanish labor law requirements |
| `AGENTS.md` | Developer guidelines + conventions |

---

## 🏗️ Architecture Highlights

### Multi-Tenancy
- **Path-based:** `https://torretempo.com/t/{tenantSlug}/...`
- **Middleware:** `tenantContext()` extracts + validates tenant from URL
- **Database:** PostgreSQL RLS policies (to be implemented)
- **Isolation:** Logical partitioning via `tenant_id` column

### Authentication
- **JWT-based:** Short-lived access tokens (15min) + refresh tokens (7d)
- **Tenant-scoped:** Tokens include `tenantId` claim
- **Middleware:** `authenticate()` validates token + tenant match

### Module Gating
- **Middleware:** `requireModule(moduleKey)` enforces paid add-ons
- **Database:** `tenant_modules` table tracks enabled modules
- **Trial support:** Automatic trial expiration

### Critical Path
1. **Tenant resolution** → `tenantContext` middleware
2. **Authentication** → `authenticate` middleware
3. **Module gating** → `requireModule` middleware
4. **Business logic** → Services + Repositories
5. **Audit trail** → `AuditLog` table

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
cd apps/api && npm run test:watch

# Coverage report
cd apps/api && npm run test:coverage
```

**Target:** 80%+ coverage on all services and utilities.

---

## 🔍 Available Scripts

### Root (Turborepo)
```bash
npm run dev          # Start all apps in development
npm run build        # Build all apps for production
npm run test         # Run tests across all apps
npm run lint         # Run linters
npm run format       # Format code with Prettier
npm run clean        # Clean build artifacts
```

### Backend (apps/api)
```bash
npm run dev              # Start dev server (hot reload)
npm run build            # TypeScript compile
npm start                # Production server
npm test                 # Jest tests
npm run lint             # ESLint
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:seed          # Seed database
npm run db:studio        # Open Prisma Studio
```

### Frontend (apps/web)
```bash
npm run dev              # Vite dev server
npm run build            # Production build
npm run preview          # Preview production build
npm test                 # Vitest
```

### Mobile (apps/mobile)
```bash
npm start                # Expo dev server
npm run ios              # iOS simulator
npm run android          # Android emulator
```

---

## 📝 Next Steps

### Sprint 1: Foundation (Weeks 1-2)
- [x] Repository scaffolding
- [x] Prisma schema + migrations
- [x] Middleware stack (tenant, auth, module gating)
- [x] Auth service + login endpoint
- [ ] Employee CRUD endpoints
- [ ] Basic tests
- [ ] Docker Compose working

### Sprint 2: Time Tracking Core (Weeks 3-4)
- [ ] Time entry CRUD endpoints
- [ ] Clock in/out logic
- [ ] Event-only geolocation capture
- [ ] Overtime calculation
- [ ] Frontend: Login page + dashboard

### Sprint 3: Leave Requests + RBAC (Weeks 5-6)
- [ ] Leave request workflow
- [ ] Approval queue
- [ ] Role-based permissions enforcement

### Sprint 4-5: Scheduling (Weeks 7-14)
- [ ] Schedule CRUD + publish/lock workflow
- [ ] Drag-and-drop calendar UI
- [ ] Conflict detection (all types)
- [ ] Shift templates + copy week

---

## 🛠️ Tech Stack Details

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **ORM:** Prisma 5
- **Database:** PostgreSQL 15
- **Cache/Queue:** Redis 7 + BullMQ
- **Validation:** Zod
- **Logging:** Pino
- **Auth:** jsonwebtoken + bcrypt
- **Testing:** Jest + Supertest

### Frontend
- **Framework:** React 18
- **Build:** Vite 5
- **State:** Zustand + React Query
- **Router:** React Router 6
- **HTTP:** Axios
- **Date:** date-fns
- **Testing:** Vitest

### Mobile
- **Framework:** React Native 0.73
- **Platform:** Expo 50
- **Router:** Expo Router
- **State:** Zustand + React Query

### Infrastructure
- **Monorepo:** Turborepo
- **Reverse Proxy:** Nginx (TBD)
- **Deployment:** Docker + PM2 (TBD)

---

## 🔒 Security Notes

- **JWT secrets:** Change default secrets in `.env` for production
- **Database:** Use strong passwords for PostgreSQL
- **PII Encryption:** Implement encryption for `nationalId`, `socialSecurity`, `taxId` fields
- **Rate Limiting:** Configured via express-rate-limit (to be tuned)
- **CORS:** Configure `CORS_ORIGIN` in `.env` for production

---

## 📞 Support

- **Documentation Issues:** Check `docs/` folder first
- **Build Issues:** Run `./build.sh` to diagnose
- **Database Issues:** Check Docker Compose logs: `docker-compose logs postgres`

---

## 📜 License

Proprietary - All Rights Reserved

---

**Happy Coding! 🚀**
