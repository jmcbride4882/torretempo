# 🕐 Torre Tempo v3 (ttv3)

**Production SaaS Time Tracking & Labor Compliance Platform**

[![Production](https://img.shields.io/badge/status-live-success)](https://time.lsltgroup.es)
[![License](https://img.shields.io/badge/license-Proprietary-red)](LICENSE)
[![Node](https://img.shields.io/badge/node-20%20LTS-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue)](https://typescriptlang.org)

**Live Production:** [https://time.lsltgroup.es](https://time.lsltgroup.es)  
**Company:** [LSLT Apps](https://lsltapps.com) - Lakeside La Torre (Murcia) Group SL  
**Developer:** John McBride

---

## 🎯 Overview

Torre Tempo is an **enterprise-grade, multi-tenant SaaS** time tracking and workforce management system designed for **Spanish labor law compliance** (RDL 8/2019, GDPR/LOPDGDD). Primary market: hospitality, retail, and service sectors.

### ✨ Production Features (Live Now)

✅ **Multi-Tenant Architecture** - Path-based isolation with PostgreSQL RLS  
✅ **Two-Tier RBAC** - Platform Admin + Tenant roles (Owner/Admin/Manager/Employee)  
✅ **Employee Management** - Full CRUD with role assignment and welcome emails  
✅ **Authentication** - JWT tokens with automatic refresh (15min access, 7d refresh)  
✅ **Internationalization** - Spanish/English with language switcher  
✅ **Progressive Web App** - Installable on all devices with offline support  
✅ **Tenant-Specific SMTP** - Each business configures own email server  
✅ **Audit Trails** - Immutable logging for compliance  
✅ **Mobile-Responsive** - Touch-optimized UI for mobile workforce

### 🚧 In Development

🔄 **Time Tracking** - Clock in/out with event-based geolocation  
🔄 **Scheduling** - Deputy-style shift management with conflict detection  
🔄 **Leave Requests** - Absence workflow with manager approvals  
🔄 **Reports** - Attendance, overtime, payroll export

---

## 📊 Production Deployment

### Live Environment

- **URL:** https://time.lsltgroup.es
- **Server:** Hetzner Cloud VPS (95.217.163.178)
- **Stack:** Docker containers behind Nginx reverse proxy
- **Database:** PostgreSQL 15 (persistent volume)
- **Cache:** Redis 7 (persistent volume)
- **SSL:** Let's Encrypt (auto-renewal via Certbot)

### Architecture

```
┌─────────────────────────────────────────────┐
│     Nginx (Reverse Proxy + SSL)            │
│     Port 443 (HTTPS) / Port 80 (redirect)  │
└─────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼───────┐     ┌─────────▼────────┐
│  Web (React)  │     │  API (Node.js)   │
│  Port 80      │     │  Port 3000       │
│  PWA + SPA    │     │  Express + JWT   │
└───────────────┘     └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            ┌───────▼──────┐    ┌───────▼──────┐
            │ PostgreSQL   │    │    Redis     │
            │   Port 5432  │    │   Port 6379  │
            └──────────────┘    └──────────────┘
```

---

## 👥 Demo Accounts

**Tenant Slug:** `demo` (use for all logins)

| Email                     | Password      | Role               | Access Level                                 |
| ------------------------- | ------------- | ------------------ | -------------------------------------------- |
| `platform@torretempo.com` | `platform123` | **PLATFORM_ADMIN** | God mode - all tenants, platform settings    |
| `admin@torretempo.com`    | `admin123`    | **OWNER**          | Business owner - full tenant access, billing |
| `john@lsltgroup.es`       | _(existing)_  | **EMPLOYEE**       | Self-service - own data only                 |
| `info@lsltgroup.es`       | _(existing)_  | **EMPLOYEE**       | Self-service - own data only                 |

### Role Hierarchy

```
🌐 PLATFORM TIER (Software Owner)
   └── PLATFORM_ADMIN - Full platform access across all tenants

🏢 TENANT TIER (Per Business)
   ├── OWNER - Business owner (billing, modules, full control)
   ├── ADMIN - Tenant administrator (employee management, reports)
   ├── MANAGER - Department manager (team scheduling, approvals)
   └── EMPLOYEE - Regular staff (clock in/out, view schedule)
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- **Node.js** 20 LTS
- **PostgreSQL** 15+
- **Redis** 7+
- **Docker** + Docker Compose

### 1. Clone & Install

```bash
git clone https://github.com/lsltapps/torre-tempo.git
cd torre-tempo

# Copy environment variables
cp .env.example .env

# Edit .env with your JWT secrets and database credentials
nano .env
```

### 2. Start Infrastructure

```bash
# Start PostgreSQL + Redis via Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 3. Install Dependencies

```bash
# Root workspace
npm install
```

### 4. Database Setup

```bash
cd apps/api

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed with demo data
npm run db:seed
```

### 5. Start Development Servers

```bash
# From project root (starts both API + Web)
npm run dev
```

**Access:**

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000
- **Prisma Studio:** `cd apps/api && npx prisma studio`

---

## 📁 Project Structure

```
torre-tempo/
├── apps/
│   ├── api/                    # Backend API (Node.js + Express + Prisma)
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── seed.ts         # Demo data seeder
│   │   ├── src/
│   │   │   ├── middleware/     # Auth, tenant context, RBAC
│   │   │   ├── routes/         # REST API endpoints
│   │   │   ├── services/       # Business logic layer
│   │   │   ├── locales/        # Backend i18n (email templates)
│   │   │   ├── templates/      # Email HTML templates
│   │   │   └── index.ts        # Express app entry point
│   │   └── Dockerfile          # Production container image
│   │
│   ├── web/                    # Frontend SPA (React 18 + TypeScript)
│   │   ├── public/
│   │   │   ├── manifest.json   # PWA manifest
│   │   │   └── sw.js           # Service worker (offline)
│   │   ├── src/
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── pages/          # Route-level pages
│   │   │   ├── hooks/          # Custom React hooks (useAuthorization)
│   │   │   ├── services/       # API client layer
│   │   │   ├── stores/         # Zustand state management
│   │   │   ├── locales/        # Frontend i18n (Spanish/English)
│   │   │   └── i18n/           # i18next configuration
│   │   └── Dockerfile          # Production container image
│   │
│   └── mobile/                 # React Native app (Expo)
│       └── App.tsx             # (Placeholder - future development)
│
├── docs/                       # 📚 Complete technical documentation
│   ├── spec.md                 # 🔒 LOCKED - Product specification
│   ├── rbac-matrix.md          # Role permissions matrix
│   ├── api-contract.md         # REST API documentation
│   ├── data-model.md           # Database schema docs
│   ├── compliance.md           # Spanish labor law requirements
│   └── scheduling-design.md    # Deputy-style scheduling spec
│
├── nginx/                      # Nginx reverse proxy configs
│   └── nginx.prod.conf         # Production SSL + routing
│
├── docker-compose.prod.yml     # Production deployment
├── docker-compose.yml          # Local development
├── turbo.json                  # Turborepo monorepo config
├── AGENTS.md                   # Developer knowledge base
└── README.md                   # This file
```

---

## 🛠️ Tech Stack

### Backend

- **Runtime:** Node.js 20 LTS
- **Framework:** Express 4
- **ORM:** Prisma 5 (PostgreSQL 15)
- **Cache/Queue:** Redis 7 + BullMQ
- **Auth:** JWT (jsonwebtoken) + bcrypt
- **Validation:** Zod schemas
- **Email:** Nodemailer (tenant-specific SMTP)
- **i18n:** i18next (Spanish/English)
- **Logging:** Pino (structured JSON logs)
- **Testing:** Jest + Supertest

### Frontend

- **Framework:** React 18 (TypeScript)
- **Build Tool:** Vite 5
- **State Management:** Zustand
- **Router:** React Router 6
- **HTTP Client:** Axios
- **i18n:** react-i18next
- **PWA:** Workbox (service worker + manifest)
- **Testing:** Vitest + React Testing Library

### Infrastructure

- **Monorepo:** Turborepo
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Nginx (SSL termination)
- **SSL Certificates:** Let's Encrypt (Certbot)
- **Deployment:** VPS (Hetzner Cloud)
- **CI/CD:** GitHub Actions (future)

---

## 🔐 Security & Compliance

### Authentication

- **JWT tokens:** 15-minute access tokens, 7-day refresh tokens
- **Password hashing:** bcrypt with salt rounds (10)
- **Token storage:** HTTP-only cookies (production) / localStorage (dev)
- **MFA support:** TOTP via speakeasy (optional per tenant)

### Authorization (RBAC)

- **Two-tier system:** Platform Admin + Tenant roles
- **Middleware enforcement:** All routes protected by role checks
- **Platform admin bypass:** God-mode access to all tenants
- **Tenant isolation:** Row-level filtering in all queries

### Data Protection

- **Encryption at rest:** PII fields encrypted in database
- **HTTPS only:** All production traffic over TLS 1.2+
- **CORS:** Strict origin whitelisting
- **Rate limiting:** Express-rate-limit (10 req/s API, 5 req/m login)
- **SQL injection:** Parameterized queries via Prisma

### Spanish Compliance (RDL 8/2019)

- **Immutable audit trails:** Append-only time entries
- **Event-only geolocation:** GPS captured only on clock in/out
- **4-year retention:** Automatic enforcement
- **Signed exports:** Digital signatures for labor inspections (add-on)

---

## 📝 Available Scripts

### Root (Monorepo)

```bash
npm run dev           # Start all apps in development
npm run build         # Build all apps for production
npm test              # Run all tests
npm run lint          # Lint all packages
npm run clean         # Clean build artifacts
```

### Backend (`apps/api`)

```bash
npm run dev           # Start dev server (hot reload)
npm run build         # TypeScript compile
npm start             # Production server
npm test              # Jest tests
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed demo data
npm run db:studio     # Open Prisma Studio (DB GUI)
```

### Frontend (`apps/web`)

```bash
npm run dev           # Vite dev server (http://localhost:5173)
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Vitest tests
```

---

## 🚢 Deployment

### Production Deployment (VPS)

```bash
# 1. SSH to server
ssh root@time.lsltgroup.es

# 2. Pull latest code
cd /opt/torre-tempo
git pull origin main

# 3. Rebuild containers
docker-compose -f docker-compose.prod.yml build

# 4. Restart services (zero-downtime)
docker-compose -f docker-compose.prod.yml up -d

# 5. Verify health
docker ps
curl https://time.lsltgroup.es/health
```

### Environment Variables (Production)

```env
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/torre_tempo_prod

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
REFRESH_TOKEN_SECRET=your-super-secret-refresh-key-change-this

# CORS
CORS_ORIGIN=https://time.lsltgroup.es

# Node
NODE_ENV=production
```

### SSL Certificate Renewal

```bash
# Certificates auto-renew via Certbot container
# Manual renewal if needed:
docker exec torre-tempo-certbot certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
cd apps/api && npm run test:watch

# Coverage report
cd apps/api && npm run test:coverage

# E2E tests (future)
cd apps/web && npm run test:e2e
```

**Coverage Target:** 80%+ on services, 70%+ overall

---

## 📖 Documentation

| Document                                       | Description                            |
| ---------------------------------------------- | -------------------------------------- |
| [`docs/spec.md`](docs/spec.md)                 | 🔒 **LOCKED** Product specification    |
| [`docs/rbac-matrix.md`](docs/rbac-matrix.md)   | Complete RBAC permissions matrix       |
| [`docs/api-contract.md`](docs/api-contract.md) | REST API endpoints & authentication    |
| [`docs/data-model.md`](docs/data-model.md)     | PostgreSQL schema documentation        |
| [`docs/compliance.md`](docs/compliance.md)     | Spanish labor law requirements         |
| [`AGENTS.md`](AGENTS.md)                       | Developer knowledge base & conventions |

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (COMPLETE)

- [x] Multi-tenant architecture
- [x] Two-tier RBAC system
- [x] Employee management
- [x] Authentication & authorization
- [x] PWA with offline support
- [x] Internationalization (ES/EN)
- [x] Production deployment

### 🚧 Phase 2: Time Tracking (IN PROGRESS)

- [ ] Clock in/out functionality
- [ ] Event-based geolocation
- [ ] Time entry corrections workflow
- [ ] Overtime calculations
- [ ] Attendance reports

### 📅 Phase 3: Scheduling (Q2 2026)

- [ ] Deputy-style shift management
- [ ] Drag-and-drop calendar UI
- [ ] Shift templates & bulk operations
- [ ] Conflict detection (all 7 types)
- [ ] Schedule publishing & locking

### 🌴 Phase 4: Leave Management (Q3 2026)

- [ ] Leave request submission
- [ ] Manager approval workflow
- [ ] Leave balance tracking
- [ ] Calendar integration
- [ ] Compliance exports

### 📊 Phase 5: Reporting & Analytics (Q4 2026)

- [ ] Attendance reports
- [ ] Payroll export (PDF/Excel)
- [ ] Labor inspection signed exports
- [ ] Dashboard analytics
- [ ] Custom report builder

---

## 📞 Support & Contact

**Developer:** John McBride  
**Company:** LSLT Apps (Lakeside La Torre Murcia Group SL)  
**Website:** [lsltapps.com](https://lsltapps.com)  
**Production:** [time.lsltgroup.es](https://time.lsltgroup.es)

**For Issues:**

- Check `docs/` folder for technical documentation
- Review `AGENTS.md` for development guidelines
- Check Docker logs: `docker-compose logs -f`

---

## 📜 License & Copyright

**© 2026 Lakeside La Torre (Murcia) Group SL**  
**Designed and Developed by John McBride**

All Rights Reserved - Proprietary Software

This software and associated documentation are proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

---

## 🎉 Acknowledgments

Built with:

- **React** - UI framework
- **Express** - Backend framework
- **Prisma** - Type-safe ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching & job queue
- **Vite** - Frontend build tool
- **Turborepo** - Monorepo management

**Design Principles:**

- Mobile-first responsive design
- Spanish labor law compliance by design
- Zero-downtime deployments
- Security-first architecture
- Developer-friendly DX

---

**🚀 Torre Tempo v3 - Time Tracking Done Right**
