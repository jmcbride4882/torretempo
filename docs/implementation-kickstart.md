# Torre Tempo - Implementation Kickstart

**Version:** 1.0  
**Date:** February 1, 2026  
**Status:** Locked Build Plan  
**Purpose:** Single source of truth for bootstrapping Torre Tempo from zero to first commit

---

## Locked Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **ORM** | Prisma | Best DX, type safety, clean migrations |
| **State Management** | Zustand | Lightweight, avoids Redux complexity |
| **Monorepo Tool** | Turborepo | Fast builds, caching, minimal config |
| **Testing** | Jest + Supertest + Playwright | Industry standard |
| **Validation** | Zod | TypeScript-native, composable |
| **Logging** | Pino | Fastest JSON logger |
| **Date/Time** | date-fns | Tree-shakeable, immutable |

**Critical Path:** Tenant resolution → Auth → RBAC → Module gating → Audit → Time tracking → Scheduling

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Repository Setup](#2-repository-setup)
3. [Turborepo Configuration](#3-turborepo-configuration)
4. [Backend (api) Setup](#4-backend-api-setup)
5. [Database Setup (Prisma)](#5-database-setup-prisma)
6. [Middleware Architecture](#6-middleware-architecture)
7. [Authentication System](#7-authentication-system)
8. [Testing Infrastructure](#8-testing-infrastructure)
9. [Frontend (web) Setup](#9-frontend-web-setup)
10. [Mobile (React Native) Setup](#10-mobile-react-native-setup)
11. [First Sprint Roadmap](#11-first-sprint-roadmap)

---

## 1. Prerequisites

### Required Software

```bash
# Node.js 20 LTS
node --version  # Should be v20.x.x

# PostgreSQL 15+
psql --version  # Should be 15.x or higher

# Redis (for caching + BullMQ)
redis-cli --version

# Docker + Docker Compose (for local dev)
docker --version
docker-compose --version

# Git
git --version
```

### Development Tools

```bash
# Global packages
npm install -g turbo typescript tsx nodemon prisma
```

---

## 2. Repository Setup

### 2.1 Initialize Git Repository

```bash
cd Torre-Tempo
git init
git add .
git commit -m "Initial commit: project structure + specs"
```

### 2.2 Root package.json

Create `package.json` at root:

```json
{
  "name": "torre-tempo",
  "version": "1.0.0",
  "private": true,
  "description": "Multi-tenant SaaS time tracking system for Spanish compliance",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "turbo run clean && rm -rf node_modules"
  },
  "devDependencies": {
    "turbo": "^1.11.0",
    "prettier": "^3.1.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

### 2.3 .gitignore

Create `.gitignore` at root:

```
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/
.nyc_output/

# Build outputs
dist/
build/
.next/
out/

# Environment variables
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*
pino-*.log

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Prisma
prisma/migrations/

# Turborepo
.turbo/

# Expo (mobile)
.expo/
.expo-shared/

# Redis dump
dump.rdb
```

### 2.4 .env.example

Create `.env.example` at root:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/torre_tempo_dev"
DATABASE_URL_TEST="postgresql://postgres:postgres@localhost:5432/torre_tempo_test"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key-change-in-production"
JWT_EXPIRES_IN="15m"
REFRESH_TOKEN_SECRET="your-refresh-secret-change-in-production"
REFRESH_TOKEN_EXPIRES_IN="7d"

# Node
NODE_ENV="development"
PORT=3000

# CORS
CORS_ORIGIN="http://localhost:5173"

# Logging
LOG_LEVEL="debug"

# Tenant (for local dev)
DEFAULT_TENANT_SLUG="demo"
```

---

## 3. Turborepo Configuration

### 3.1 turbo.json

Create `turbo.json` at root:

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
```

### 3.2 Install Dependencies

```bash
npm install
```

---

## 4. Backend (api) Setup

### 4.1 apps/api/package.json

Create `apps/api/package.json`:

```json
{
  "name": "@torre-tempo/api",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --watchAll=false",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.5",
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "@prisma/client": "^5.8.0",
    "zod": "^3.22.4",
    "pino": "^8.17.2",
    "pino-http": "^8.6.1",
    "pino-pretty": "^10.3.1",
    "date-fns": "^3.0.6",
    "date-fns-tz": "^2.0.0",
    "bullmq": "^5.1.5",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/node": "^20.10.6",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0",
    "prisma": "^5.8.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.11",
    "ts-jest": "^29.1.1",
    "supertest": "^6.3.3",
    "@types/supertest": "^6.0.2",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0"
  }
}
```

### 4.2 apps/api/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "types": ["node", "jest"],
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 4.3 apps/api/.eslintrc.json

```json
{
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module",
    "project": "./tsconfig.json"
  },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "no-console": "warn"
  }
}
```

### 4.4 apps/api/jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
```

### 4.5 Directory Structure

```bash
mkdir -p apps/api/src/{middleware,routes,services,repositories,validators,utils,types}
mkdir -p apps/api/prisma
```

### 4.6 apps/api/src/index.ts (Bootstrap)

```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes will be added here
// app.use('/api/v1', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Torre Tempo API listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

export default app;
```

---

## 5. Database Setup (Prisma)

### 5.1 apps/api/prisma/schema.prisma

Create comprehensive Prisma schema based on `data-model.md`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// PLATFORM-LEVEL TABLES
// ============================================================================

model User {
  id        String   @id @default(uuid()) @db.Uuid
  email     String   @unique
  password  String
  firstName String   @map("first_name")
  lastName  String   @map("last_name")
  status    String   @default("active") // 'active', 'suspended', 'deleted'
  
  // MFA
  mfaEnabled Boolean  @default(false) @map("mfa_enabled")
  mfaSecret  String?  @map("mfa_secret")
  
  // Audit
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenantUsers      TenantUser[]
  sessionsCreated  AuditLog[]       @relation("AuditLogUser")
  
  @@map("users")
}

// ============================================================================
// TENANT MANAGEMENT
// ============================================================================

model Tenant {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique // URL-safe identifier for path-based routing
  legalName String   @map("legal_name")
  taxId     String?  @map("tax_id") // CIF/NIF (encrypted)
  email     String
  phone     String?
  address   String?
  
  // Branding
  logoUrl        String? @map("logo_url")
  primaryColor   String? @map("primary_color")
  secondaryColor String? @map("secondary_color")
  
  // Localization
  timezone String @default("Europe/Madrid")
  locale   String @default("es-ES")
  currency String @default("EUR")
  
  // Configuration (JSONB)
  settings Json?
  
  // Subscription
  subscriptionStatus String @default("active") @map("subscription_status") // 'trial', 'active', 'suspended', 'cancelled'
  subscriptionPlan   String? @map("subscription_plan")
  maxEmployees       Int?    @map("max_employees")
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenantUsers      TenantUser[]
  tenantModules    TenantModule[]
  employees        Employee[]
  departments      Department[]
  timeEntries      TimeEntry[]
  leaveRequests    LeaveRequest[]
  schedules        Schedule[]
  shifts           Shift[]
  shiftTemplates   ShiftTemplate[]
  auditLogs        AuditLog[]
  
  @@index([slug])
  @@index([subscriptionStatus], map: "idx_tenants_status")
  @@map("tenants")
}

model TenantUser {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  userId   String @map("user_id") @db.Uuid
  role     String // 'admin', 'manager', 'employee'
  
  // Audit
  createdAt DateTime @default(now()) @map("created_at")
  
  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, userId])
  @@index([tenantId])
  @@index([userId])
  @@map("tenant_users")
}

model TenantModule {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  
  // Module identification
  moduleKey String @map("module_key") // 'advanced_scheduling', 'compliance_pack', etc.
  
  // Enablement
  enabled    Boolean   @default(true)
  enabledAt  DateTime  @default(now()) @map("enabled_at")
  enabledBy  String?   @map("enabled_by") @db.Uuid
  disabledAt DateTime? @map("disabled_at")
  disabledBy String?   @map("disabled_by") @db.Uuid
  
  // Trial tracking
  trialUntil    DateTime? @map("trial_until")
  trialStartedAt DateTime? @map("trial_started_at")
  
  // Configuration (JSONB)
  config Json?
  
  // Audit
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, moduleKey])
  @@index([tenantId])
  @@index([trialUntil])
  @@map("tenant_modules")
}

// ============================================================================
// EMPLOYEE MANAGEMENT
// ============================================================================

model Department {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  
  name        String
  description String?
  parentId    String? @map("parent_id") @db.Uuid
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant     Tenant       @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parent     Department?  @relation("DepartmentHierarchy", fields: [parentId], references: [id])
  children   Department[] @relation("DepartmentHierarchy")
  employees  Employee[]
  
  @@index([tenantId])
  @@index([parentId])
  @@map("departments")
}

model Employee {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  userId   String @map("user_id") @db.Uuid // Link to User table
  
  // Personal info
  nationalId      String  @map("national_id") // DNI/NIE (encrypted)
  socialSecurity  String  @map("social_security") // Encrypted
  phone           String?
  emergencyContact String? @map("emergency_contact")
  
  // Employment
  employeeNumber String?   @unique @map("employee_number")
  departmentId   String?   @map("department_id") @db.Uuid
  position       String?
  contractType   String    @map("contract_type") // 'indefinido', 'temporal', etc.
  hireDate       DateTime  @map("hire_date")
  terminationDate DateTime? @map("termination_date")
  
  // Work schedule
  workSchedule String @default("full-time") @map("work_schedule")
  
  // Status
  status String @default("active") // 'active', 'on_leave', 'terminated'
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant             Tenant               @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  department         Department?          @relation(fields: [departmentId], references: [id])
  timeEntries        TimeEntry[]
  leaveRequests      LeaveRequest[]
  shifts             Shift[]
  shiftAssignments   ShiftAssignment[]
  employeeAvailability EmployeeAvailability[]
  
  @@index([tenantId])
  @@index([userId])
  @@index([departmentId])
  @@map("employees")
}

// ============================================================================
// TIME TRACKING
// ============================================================================

model TimeEntry {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  employeeId String @map("employee_id") @db.Uuid
  
  // Timing
  clockIn  DateTime  @map("clock_in")
  clockOut DateTime? @map("clock_out")
  
  // Break tracking
  breakMinutes Int @default(0) @map("break_minutes")
  
  // Location (event-only geolocation)
  clockInLat  Float?  @map("clock_in_lat")
  clockInLng  Float?  @map("clock_in_lng")
  clockOutLat Float?  @map("clock_out_lat")
  clockOutLng Float?  @map("clock_out_lng")
  
  // Calculated fields
  totalHours    Float?  @map("total_hours")
  overtimeHours Float?  @map("overtime_hours")
  
  // Status
  status String @default("active") // 'active', 'corrected', 'deleted'
  
  // Notes
  notes String?
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([employeeId])
  @@index([clockIn])
  @@map("time_entries")
}

// ============================================================================
// LEAVE MANAGEMENT
// ============================================================================

model LeaveRequest {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  employeeId String @map("employee_id") @db.Uuid
  
  // Leave details
  leaveType  String   @map("leave_type") // 'vacation', 'sick', 'personal', etc.
  startDate  DateTime @map("start_date")
  endDate    DateTime @map("end_date")
  totalDays  Float    @map("total_days")
  
  // Approval
  status       String    @default("pending") // 'pending', 'approved', 'rejected'
  approvedBy   String?   @map("approved_by") @db.Uuid
  approvedAt   DateTime? @map("approved_at")
  rejectedBy   String?   @map("rejected_by") @db.Uuid
  rejectedAt   DateTime? @map("rejected_at")
  rejectionReason String? @map("rejection_reason")
  
  // Notes
  notes String?
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([employeeId])
  @@index([status])
  @@map("leave_requests")
}

// ============================================================================
// SCHEDULING (Advanced Scheduling Module)
// ============================================================================

model Schedule {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  
  // Schedule period
  title     String
  startDate DateTime @map("start_date") @db.Date
  endDate   DateTime @map("end_date") @db.Date
  
  // Status workflow
  status      String    @default("draft") @map("status") // 'draft', 'published', 'locked'
  publishedAt DateTime? @map("published_at")
  publishedBy String?   @map("published_by") @db.Uuid
  lockedAt    DateTime? @map("locked_at")
  lockedBy    String?   @map("locked_by") @db.Uuid
  unlockReason String?  @map("unlock_reason")
  
  // Scope (optional filtering)
  departmentId String? @map("department_id") @db.Uuid
  location     String?
  
  // Metadata (JSONB)
  notes    String?
  metadata Json?
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  createdBy String    @map("created_by") @db.Uuid
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  shifts Shift[]
  
  @@index([tenantId])
  @@index([tenantId, status])
  @@index([tenantId, startDate, endDate])
  @@map("schedules")
}

model Shift {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @map("tenant_id") @db.Uuid
  scheduleId String @map("schedule_id") @db.Uuid
  
  // Timing
  startTime    DateTime @map("start_time")
  endTime      DateTime @map("end_time")
  breakMinutes Int      @default(0) @map("break_minutes")
  
  // Work details
  role       String?
  location   String?
  workCenter String? @map("work_center")
  
  // Assignment
  employeeId       String? @map("employee_id") @db.Uuid
  assignmentStatus String  @default("unassigned") @map("assignment_status") // 'unassigned', 'assigned', 'accepted', 'swapped'
  
  // Conflict detection
  hasConflicts    Boolean @default(false) @map("has_conflicts")
  conflictDetails Json?   @map("conflict_details")
  
  // UI/UX
  color String?
  notes String?
  
  // Metadata (JSONB)
  metadata Json?
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant       Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  schedule     Schedule          @relation(fields: [scheduleId], references: [id], onDelete: Cascade)
  employee     Employee?         @relation(fields: [employeeId], references: [id], onDelete: SetNull)
  assignments  ShiftAssignment[]
  
  @@index([tenantId])
  @@index([tenantId, scheduleId])
  @@index([tenantId, employeeId])
  @@index([tenantId, startTime, endTime])
  @@map("shifts")
}

model ShiftAssignment {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @map("tenant_id") @db.Uuid
  shiftId    String @map("shift_id") @db.Uuid
  employeeId String @map("employee_id") @db.Uuid
  
  // Assignment
  assignedBy String   @map("assigned_by") @db.Uuid
  assignedAt DateTime @default(now()) @map("assigned_at")
  
  // Status tracking
  status         String    @default("pending") // 'pending', 'accepted', 'declined', 'swapped'
  acceptedAt     DateTime? @map("accepted_at")
  declinedAt     DateTime? @map("declined_at")
  declineReason  String?   @map("decline_reason")
  
  // Swap tracking
  swappedToEmployeeId String?   @map("swapped_to_employee_id") @db.Uuid
  swapRequestedAt     DateTime? @map("swap_requested_at")
  swapApprovedBy      String?   @map("swap_approved_by") @db.Uuid
  swapApprovedAt      DateTime? @map("swap_approved_at")
  
  // Metadata
  notes    String?
  metadata Json?
  
  // Audit
  createdAt DateTime @default(now()) @map("created_at")
  
  // Relations
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  shift    Shift    @relation(fields: [shiftId], references: [id], onDelete: Cascade)
  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@index([shiftId])
  @@index([employeeId])
  @@map("shift_assignments")
}

model ShiftTemplate {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  
  // Template details
  name        String
  description String?
  
  // Timing (relative)
  startTime    DateTime @map("start_time") @db.Time
  endTime      DateTime @map("end_time") @db.Time
  breakMinutes Int      @default(0) @map("break_minutes")
  
  // Work details
  role       String?
  location   String?
  workCenter String? @map("work_center")
  
  // UI/UX
  color String?
  
  // Metadata (JSONB)
  metadata Json?
  
  // Audit
  createdAt DateTime  @default(now()) @map("created_at")
  createdBy String    @map("created_by") @db.Uuid
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  
  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])
  @@map("shift_templates")
}

model EmployeeAvailability {
  id         String @id @default(uuid()) @db.Uuid
  tenantId   String @map("tenant_id") @db.Uuid
  employeeId String @map("employee_id") @db.Uuid
  
  // Day of week (0 = Sunday, 6 = Saturday)
  dayOfWeek Int    @map("day_of_week")
  
  // Availability status
  status String @default("available") // 'available', 'unavailable', 'preferred'
  
  // Time window (NULL = all day)
  startTime DateTime? @map("start_time") @db.Time
  endTime   DateTime? @map("end_time") @db.Time
  
  // Metadata
  notes    String?
  metadata Json?
  
  // Audit
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  // Relations
  tenant   Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  
  @@unique([tenantId, employeeId, dayOfWeek, startTime, endTime])
  @@index([tenantId])
  @@index([tenantId, employeeId])
  @@map("employee_availability")
}

// ============================================================================
// AUDIT & COMPLIANCE
// ============================================================================

model AuditLog {
  id       String @id @default(uuid()) @db.Uuid
  tenantId String @map("tenant_id") @db.Uuid
  
  // Actor
  userId    String @map("user_id") @db.Uuid
  userEmail String @map("user_email")
  
  // Action
  action       String // 'create', 'update', 'delete', 'login', 'export', etc.
  resourceType String @map("resource_type") // 'time_entry', 'employee', 'schedule', etc.
  resourceId   String @map("resource_id") @db.Uuid
  
  // Changes (JSONB)
  changesBefore Json? @map("changes_before")
  changesAfter  Json? @map("changes_after")
  
  // Context
  ipAddress String? @map("ip_address")
  userAgent String? @map("user_agent")
  metadata  Json?
  
  // Audit
  createdAt DateTime @default(now()) @map("created_at")
  
  // Relations
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user   User   @relation("AuditLogUser", fields: [userId], references: [id])
  
  @@index([tenantId])
  @@index([userId])
  @@index([resourceType, resourceId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

### 5.2 Initial Migration

```bash
cd apps/api
npm install

# Generate Prisma Client
npx prisma generate

# Create first migration
npx prisma migrate dev --name init

# Check migration
npx prisma migrate status
```

### 5.3 apps/api/prisma/seed.ts

Create seed script for local development:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create platform user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const platformUser = await prisma.user.create({
    data: {
      email: 'admin@torretempo.com',
      password: passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
    },
  });

  console.log('✅ Created platform user:', platformUser.email);

  // Create demo tenant
  const demoTenant = await prisma.tenant.create({
    data: {
      slug: 'demo',
      legalName: 'Demo Restaurant SL',
      taxId: 'B12345678',
      email: 'demo@torretempo.com',
      phone: '+34912345678',
      address: 'Calle Demo, 1, Madrid',
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      currency: 'EUR',
      subscriptionStatus: 'active',
      settings: {
        workHours: {
          standardHoursPerDay: 8,
          standardHoursPerWeek: 40,
          overtimeThreshold: 'daily',
          overtimeRate: 1.5,
        },
        breaks: {
          autoDeduct: true,
          breakMinutes: 30,
          breakAfterHours: 6,
        },
      },
    },
  });

  console.log('✅ Created demo tenant:', demoTenant.slug);

  // Link user to tenant as admin
  await prisma.tenantUser.create({
    data: {
      tenantId: demoTenant.id,
      userId: platformUser.id,
      role: 'admin',
    },
  });

  console.log('✅ Linked user to tenant');

  // Enable advanced scheduling module
  await prisma.tenantModule.create({
    data: {
      tenantId: demoTenant.id,
      moduleKey: 'advanced_scheduling',
      enabled: true,
    },
  });

  console.log('✅ Enabled advanced_scheduling module');

  // Create demo department
  const department = await prisma.department.create({
    data: {
      tenantId: demoTenant.id,
      name: 'Kitchen',
      description: 'Kitchen staff',
    },
  });

  console.log('✅ Created demo department');

  // Create demo employee
  const employee = await prisma.employee.create({
    data: {
      tenantId: demoTenant.id,
      userId: platformUser.id,
      nationalId: 'DNI12345678A', // Would be encrypted in production
      socialSecurity: 'SS123456789', // Would be encrypted in production
      phone: '+34612345678',
      employeeNumber: 'EMP001',
      departmentId: department.id,
      position: 'Chef',
      contractType: 'indefinido',
      hireDate: new Date('2024-01-01'),
      workSchedule: 'full-time',
      status: 'active',
    },
  });

  console.log('✅ Created demo employee');

  console.log('🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run seed:

```bash
npm run db:seed
```

---

## 6. Middleware Architecture

### 6.1 apps/api/src/utils/logger.ts

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            ignore: 'pid,hostname',
            translateTime: 'HH:MM:ss',
          },
        }
      : undefined,
});
```

### 6.2 apps/api/src/middleware/tenant-context.ts

**CRITICAL:** Extracts tenant from URL path and validates access.

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        slug: string;
        legalName: string;
        settings: any;
      };
      tenantId?: string;
    }
  }
}

export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract tenant slug from path: /t/:tenantSlug/...
    const slugMatch = req.path.match(/^\/t\/([^\/]+)/);
    
    if (!slugMatch) {
      res.status(400).json({
        error: 'Tenant slug required in path',
        message: 'URL must be in format: /t/{tenantSlug}/...',
      });
      return;
    }

    const tenantSlug = slugMatch[1];

    // Fetch tenant from database
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        slug: true,
        legalName: true,
        settings: true,
        subscriptionStatus: true,
      },
    });

    if (!tenant) {
      res.status(404).json({
        error: 'Tenant not found',
        message: `Tenant '${tenantSlug}' does not exist`,
      });
      return;
    }

    // Check if tenant is active
    if (tenant.subscriptionStatus !== 'active' && tenant.subscriptionStatus !== 'trial') {
      res.status(403).json({
        error: 'Tenant suspended',
        message: 'This tenant account is not active',
      });
      return;
    }

    // Inject tenant context into request
    req.tenant = tenant;
    req.tenantId = tenant.id;

    logger.debug({ tenantId: tenant.id, slug: tenant.slug }, 'Tenant context resolved');

    next();
  } catch (error) {
    logger.error({ error }, 'Failed to resolve tenant context');
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 6.3 apps/api/src/middleware/auth.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface JwtPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
      return;
    }

    const token = authHeader.substring(7);

    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    // Verify token's tenant matches request tenant
    if (req.tenantId && payload.tenantId !== req.tenantId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Token tenant does not match request tenant',
      });
      return;
    }

    req.user = payload;

    logger.debug(
      { userId: payload.userId, tenantId: payload.tenantId },
      'User authenticated'
    );

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token',
      });
      return;
    }

    logger.error({ error }, 'Authentication failed');
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### 6.4 apps/api/src/middleware/require-module.ts

**CRITICAL:** Module-gated access control.

```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export function requireModule(moduleKey: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.tenantId) {
        res.status(400).json({ error: 'Tenant context required' });
        return;
      }

      // Check if module is enabled for tenant
      const tenantModule = await prisma.tenantModule.findUnique({
        where: {
          tenantId_moduleKey: {
            tenantId: req.tenantId,
            moduleKey,
          },
        },
      });

      if (!tenantModule || !tenantModule.enabled) {
        res.status(403).json({
          error: 'Module not enabled',
          message: `The '${moduleKey}' module is not enabled for this tenant`,
          upgrade_url: `/t/${req.tenant?.slug}/billing/upgrade?module=${moduleKey}`,
        });
        return;
      }

      // Check if trial expired
      if (
        tenantModule.trialUntil &&
        new Date() > tenantModule.trialUntil
      ) {
        res.status(403).json({
          error: 'Module trial expired',
          message: `The trial for '${moduleKey}' has expired`,
          upgrade_url: `/t/${req.tenant?.slug}/billing/upgrade?module=${moduleKey}`,
        });
        return;
      }

      logger.debug(
        { tenantId: req.tenantId, moduleKey },
        'Module access granted'
      );

      next();
    } catch (error) {
      logger.error({ error, moduleKey }, 'Module check failed');
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
```

### 6.5 apps/api/src/middleware/error-handler.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  logger.error(
    {
      error: err,
      path: req.path,
      method: req.method,
      tenantId: req.tenantId,
      userId: req.user?.userId,
    },
    'Unhandled error'
  );

  res.status(500).json({
    error: 'Internal server error',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred',
  });
}
```

### 6.6 apps/api/src/middleware/not-found.ts

```typescript
import { Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
```

---

## 7. Authentication System

### 7.1 apps/api/src/services/auth.service.ts

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

interface LoginInput {
  email: string;
  password: string;
  tenantSlug: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  tenant: {
    id: string;
    slug: string;
    legalName: string;
  };
}

export class AuthService {
  async login(input: LoginInput): Promise<AuthResult> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const passwordValid = await bcrypt.compare(input.password, user.password);

    if (!passwordValid) {
      throw new Error('Invalid credentials');
    }

    // Check user status
    if (user.status !== 'active') {
      throw new Error('User account is not active');
    }

    // Find tenant
    const tenant = await prisma.tenant.findUnique({
      where: { slug: input.tenantSlug },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    // Check tenant access
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
    });

    if (!tenantUser) {
      throw new Error('User does not have access to this tenant');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: tenantUser.role,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
    });

    logger.info(
      { userId: user.id, tenantId: tenant.id },
      'User logged in'
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: tenantUser.role,
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        legalName: tenant.legalName,
      },
    };
  }

  private generateAccessToken(payload: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  }): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
  }

  private generateRefreshToken(payload: {
    userId: string;
    email: string;
    tenantId: string;
  }): string {
    return jwt.sign(
      payload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      }
    );
  }
}
```

### 7.2 apps/api/src/routes/auth.routes.ts

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantSlug: z.string().min(1),
});

router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);

    const result = await authService.login(input);

    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, 'Login failed');
      res.status(401).json({
        error: 'Authentication failed',
        message: error.message,
      });
      return;
    }

    logger.error({ error }, 'Login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  // Implement token blacklist logic if needed
  res.json({ message: 'Logged out successfully' });
});

export default router;
```

---

## 8. Testing Infrastructure

### 8.1 apps/api/src/__tests__/setup.ts

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
  
  // Clean database before tests
  await prisma.$executeRawUnsafe('TRUNCATE TABLE users CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

export { prisma };
```

### 8.2 apps/api/src/__tests__/middleware/tenant-context.test.ts

```typescript
import request from 'supertest';
import express from 'express';
import { tenantContext } from '../../middleware/tenant-context';
import { prisma } from '../setup';

const app = express();
app.use(express.json());
app.use(tenantContext);
app.get('/t/:tenantSlug/test', (req, res) => {
  res.json({ tenant: req.tenant });
});

describe('Tenant Context Middleware', () => {
  let testTenant: any;

  beforeAll(async () => {
    testTenant = await prisma.tenant.create({
      data: {
        slug: 'test-tenant',
        legalName: 'Test Company SL',
        email: 'test@example.com',
        subscriptionStatus: 'active',
      },
    });
  });

  it('should extract tenant from URL path', async () => {
    const response = await request(app)
      .get('/t/test-tenant/test')
      .expect(200);

    expect(response.body.tenant).toBeDefined();
    expect(response.body.tenant.slug).toBe('test-tenant');
  });

  it('should return 404 for non-existent tenant', async () => {
    const response = await request(app)
      .get('/t/nonexistent/test')
      .expect(404);

    expect(response.body.error).toBe('Tenant not found');
  });

  it('should return 403 for suspended tenant', async () => {
    await prisma.tenant.update({
      where: { id: testTenant.id },
      data: { subscriptionStatus: 'suspended' },
    });

    const response = await request(app)
      .get('/t/test-tenant/test')
      .expect(403);

    expect(response.body.error).toBe('Tenant suspended');
  });
});
```

---

## 9. Frontend (web) Setup

### 9.1 apps/web/package.json

```json
{
  "name": "@torre-tempo/web",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.21.1",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.9",
    "axios": "^1.6.5",
    "date-fns": "^3.0.6",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/react": "^18.2.47",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.11",
    "vitest": "^1.1.3",
    "eslint": "^8.56.0"
  }
}
```

### 9.2 apps/web/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### 9.3 apps/web/src/stores/auth.store.ts (Zustand)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Tenant {
  id: string;
  slug: string;
  legalName: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, tenant: Tenant, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, tenant, accessToken, refreshToken) =>
        set({ user, tenant, accessToken, refreshToken }),
      clearAuth: () =>
        set({ user: null, tenant: null, accessToken: null, refreshToken: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
```

---

## 10. Mobile (React Native) Setup

### 10.1 apps/mobile/package.json

```json
{
  "name": "@torre-tempo/mobile",
  "version": "1.0.0",
  "main": "expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest"
  },
  "dependencies": {
    "expo": "^50.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "expo-router": "^3.4.0",
    "zustand": "^4.4.7",
    "@tanstack/react-query": "^5.17.9",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@babel/core": "^7.23.7",
    "@types/react": "^18.2.47",
    "typescript": "^5.3.3",
    "jest": "^29.7.0"
  }
}
```

---

## 11. First Sprint Roadmap

### Sprint 1: Foundation (Week 1-2)

**Goal:** Working API with tenant context + auth + basic CRUD

**Tasks:**
1. ✅ Repository setup (Turborepo, package.json, configs)
2. ✅ Prisma schema + initial migration
3. ✅ Middleware stack (tenant context, auth, module gating)
4. ✅ Auth service + login endpoint
5. ✅ Employee CRUD endpoints (with tenant scoping)
6. ✅ Basic tests (middleware, auth, employee CRUD)
7. ✅ Local dev environment (Docker Compose)

**Acceptance Criteria:**
- [ ] `POST /t/demo/api/v1/auth/login` returns JWT
- [ ] `GET /t/demo/api/v1/employees` requires auth + tenant context
- [ ] All tests pass (>80% coverage)
- [ ] Docker Compose brings up PostgreSQL + Redis

---

### Sprint 2: Time Tracking Core (Week 3-4)

**Goal:** Clock in/out + time entry management

**Tasks:**
1. Time entry CRUD endpoints
2. Clock in/out logic (overlap detection, auto break deduction)
3. Geolocation capture (event-only)
4. Overtime calculation
5. Time entry correction workflow
6. Frontend: Login page + dashboard
7. Frontend: Clock in/out UI

**Acceptance Criteria:**
- [ ] Employees can clock in/out via API
- [ ] Geolocation captured ONLY on clock in/out events
- [ ] Overtime auto-calculated per tenant settings
- [ ] Frontend: Employees can see their time entries

---

### Sprint 3: Leave Requests + RBAC (Week 5-6)

**Goal:** Leave request workflow + role-based permissions

**Tasks:**
1. Leave request CRUD endpoints
2. Approval workflow (pending → approved/rejected)
3. RBAC middleware (admin, manager, employee roles)
4. Leave balance tracking
5. Frontend: Leave request form
6. Frontend: Manager approval queue

**Acceptance Criteria:**
- [ ] Employees can request leave
- [ ] Managers can approve/reject leave
- [ ] RBAC enforces permissions (employees can't approve own requests)

---

### Sprint 4: Scheduling MVP (Week 7-10)

**Goal:** Basic scheduling (no drag-and-drop yet)

**Tasks:**
1. Schedule CRUD endpoints
2. Shift CRUD endpoints
3. Publish/lock workflow
4. Basic conflict detection (overlap only)
5. Frontend: Schedule list view
6. Frontend: Shift creation form

**Acceptance Criteria:**
- [ ] Managers can create schedules
- [ ] Managers can assign shifts to employees
- [ ] Overlap conflicts detected
- [ ] Schedules can be published (employees notified)

---

### Sprint 5: Scheduling Advanced (Week 11-14)

**Goal:** Drag-and-drop scheduling + full conflict detection

**Tasks:**
1. React Big Calendar integration
2. @dnd-kit/core drag-and-drop
3. Full conflict detection (rest period, availability, max hours)
4. Shift templates
5. Copy week functionality
6. Frontend: Visual schedule grid

**Acceptance Criteria:**
- [ ] Drag-and-drop shift creation/assignment
- [ ] All conflict types detected
- [ ] Shift templates work
- [ ] Copy week copies all shifts to future dates

---

## Docker Compose for Local Dev

Create `docker-compose.yml` at root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: torre-tempo-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: torre_tempo_dev
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  postgres_test:
    image: postgres:15-alpine
    container_name: torre-tempo-postgres-test
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: torre_tempo_test
    ports:
      - '5433:5432'

  redis:
    image: redis:7-alpine
    container_name: torre-tempo-redis
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

Start services:

```bash
docker-compose up -d
```

---

## Summary Checklist

### Repository Setup
- [ ] `package.json` at root with Turborepo scripts
- [ ] `.gitignore` configured
- [ ] `.env.example` created
- [ ] `turbo.json` configured

### Backend (api)
- [ ] `apps/api/package.json` with all dependencies
- [ ] `apps/api/tsconfig.json` configured
- [ ] `apps/api/.eslintrc.json` configured
- [ ] `apps/api/jest.config.js` configured
- [ ] `apps/api/prisma/schema.prisma` complete
- [ ] Initial migration created (`npx prisma migrate dev`)
- [ ] Seed script created and run
- [ ] Middleware stack implemented (tenant, auth, module)
- [ ] Auth service + login endpoint
- [ ] Tests passing

### Frontend (web)
- [ ] `apps/web/package.json` with Vite + React
- [ ] `apps/web/vite.config.ts` configured
- [ ] Zustand auth store created
- [ ] Login page scaffolded

### Infrastructure
- [ ] Docker Compose configured
- [ ] PostgreSQL running locally
- [ ] Redis running locally
- [ ] Environment variables set

### Documentation
- [ ] `AGENTS.md` created
- [ ] `docs/implementation-kickstart.md` created
- [ ] `docs/scheduling-design.md` created

---

## Next Command

After completing this kickstart:

```bash
# Start Docker services
docker-compose up -d

# Install all dependencies
npm install

# Generate Prisma client
cd apps/api && npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run db:seed

# Start development
npm run dev
```

Then navigate to:
- API: http://localhost:3000/health
- Web: http://localhost:5173

---

**You are now ready to build Torre Tempo.** 🚀
