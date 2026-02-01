# Torre Tempo - Data Model Documentation

**Version:** 1.1 (Path-Based Tenancy + Scheduling + Modules)  
**Date:** February 1, 2026  
**Changelog:** Fixed tenancy method (path-based), added scheduling tables, module management, compliance documents  
**Status:** Final Data Model Specification  
**Project:** Multi-Tenant SaaS Time Tracking System

---

## Table of Contents

1. [Overview](#1-overview)
2. [Multi-Tenancy Architecture](#2-multi-tenancy-architecture)
3. [Database Schema](#3-database-schema)
4. [Entity Relationships](#4-entity-relationships)
5. [Table Specifications](#5-table-specifications)
6. [Indexes and Performance](#6-indexes-and-performance)
7. [Data Integrity and Constraints](#7-data-integrity-and-constraints)
8. [Data Validation Rules](#8-data-validation-rules)
9. [Migration Strategy](#9-migration-strategy)
10. [Data Retention and Archival](#10-data-retention-and-archival)

---

## 1. Overview

### 1.1 Database Technology

**Database:** PostgreSQL 15+

**Key Features:**
- UUID primary keys for all tables
- JSONB columns for flexible metadata storage
- PostGIS extension for geolocation tracking (optional)
- Soft delete pattern for audit compliance
- Timestamp tracking (created_at, updated_at, deleted_at)

### 1.2 Design Principles

1. **Multi-Tenancy:** Logical isolation using `tenant_id` column in all tenant-scoped tables
2. **Data Integrity:** Foreign key constraints with CASCADE rules
3. **Audit Trail:** Comprehensive audit logging for all data modifications
4. **Compliance:** 4-year data retention for Spanish labor law compliance
5. **Performance:** Strategic indexing on frequently queried columns
6. **Extensibility:** JSONB columns for custom fields and settings

### 1.3 Naming Conventions

- **Tables:** Lowercase with underscores (e.g., `time_entries`, `leave_requests`)
- **Columns:** Lowercase with underscores (e.g., `employee_number`, `clock_in`)
- **Primary Keys:** `id` (UUID)
- **Foreign Keys:** `{table_name}_id` (e.g., `tenant_id`, `employee_id`)
- **Timestamps:** `created_at`, `updated_at`, `deleted_at`
- **Indexes:** `idx_{table}_{column(s)}` (e.g., `idx_employees_tenant`)

---

## 2. Multi-Tenancy Architecture

### 2.1 Isolation Strategy

**Approach:** Shared schema with logical isolation

**Implementation:**
- Every tenant-scoped table includes a `tenant_id` column
- All queries automatically filtered by `tenant_id` via middleware
- Foreign key relationships include `tenant_id` for referential integrity
- Composite indexes on `(tenant_id, id)` for optimal performance

### 2.2 Tenant Identification

**Method:** Path-based routing

- **Format:** `/t/{tenantSlug}/` (e.g., `https://time.lsltgroup.es/t/lakeside-murcia/`)
- **Production Domains:** `time.lsltgroup.es`, `time.lsltapps.com`
- **Lookup:** Tenant resolved from path segment or JWT token
- **Enforcement:** Middleware ensures all queries are tenant-scoped
- **Future:** Subdomain-based routing MAY be enabled without schema changes

### 2.3 Data Isolation Guarantees

1. **Query-Level Isolation:** All queries include `WHERE tenant_id = ?`
2. **Foreign Key Constraints:** Cross-tenant references prevented by composite keys
3. **Index Optimization:** Composite indexes ensure tenant data is physically co-located
4. **Audit Logging:** All cross-tenant access attempts logged

---

## 3. Database Schema

### 3.1 Schema Overview

```
Torre Tempo Database Schema
├── Platform-Level Tables (no tenant_id)
│   ├── users
│   └── platform_roles
│
├── Tenant Management
│   ├── tenants
│   └── tenant_users
│
├── Employee Management
│   ├── employees
│   └── departments
│
├── Time Tracking
│   ├── time_entries
│   ├── leave_requests
│   └── projects (optional)
│
├── Advanced Scheduling (tenant-scoped)
│   ├── schedules
│   ├── shifts
│   └── shift_assignments
│
├── Module Management (tenant-scoped)
│   └── tenant_modules
│
├── Compliance & Legal (tenant-scoped)
│   └── compliance_documents
│
└── Audit & Compliance
    └── audit_logs
```

### 3.2 Table Categories

#### Platform-Level Tables
- `users` - Platform-wide user accounts
- `platform_roles` - Platform administrator roles

#### Tenant-Scoped Tables
- `tenants` - Tenant metadata and settings
- `tenant_users` - User-tenant-role mapping
- `employees` - Employee profiles
- `departments` - Organizational structure
- `time_entries` - Clock in/out records
- `leave_requests` - Vacation and leave requests
- `projects` - Project tracking (optional)
- `schedules` - Weekly/monthly schedule drafts and published schedules
- `shifts` - Individual shift instances within schedules
- `shift_assignments` - Shift assignment history and swaps
- `tenant_modules` - Enabled add-on modules per tenant
- `compliance_documents` - DPIA, privacy notices, Works Council agreements
- `audit_logs` - Audit trail for all operations

---

## 4. Entity Relationships

### 4.1 Entity-Relationship Diagram (Text Format)

```
┌─────────────────┐
│     users       │
│  (platform)     │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌─────────────────┐
│  tenant_users   │ N:1     │    tenants      │
│  (mapping)      │────────▶│  (tenant data)  │
└─────────────────┘         └────────┬────────┘
                                     │
                                     │ 1:N
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │  employees   │ │ departments  │ │   projects   │
            └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
                   │                │                │
                   │ 1:N            │ 1:N            │
                   ▼                ▼                │
            ┌──────────────┐ ┌──────────────┐       │
            │time_entries  │ │employees     │       │
            │              │◀┤(manager_id)  │       │
            └──────┬───────┘ └──────────────┘       │
                   │                                 │
                   │ N:1                             │
                   └─────────────────────────────────┘
                   
            ┌──────────────┐
            │leave_requests│
            │              │
            └──────┬───────┘
                   │
                   │ N:1
                   ▼
            ┌──────────────┐
            │  employees   │
            └──────────────┘

┌─────────────────┐
│  audit_logs     │
│  (all changes)  │
└─────────────────┘
```

### 4.2 Key Relationships

| Parent Table | Child Table | Relationship | Cascade Rule |
|--------------|-------------|--------------|--------------|
| `tenants` | `employees` | 1:N | ON DELETE CASCADE |
| `tenants` | `departments` | 1:N | ON DELETE CASCADE |
| `tenants` | `time_entries` | 1:N | ON DELETE CASCADE |
| `tenants` | `leave_requests` | 1:N | ON DELETE CASCADE |
| `tenants` | `projects` | 1:N | ON DELETE CASCADE |
| `tenants` | `tenant_users` | 1:N | ON DELETE CASCADE |
| `users` | `tenant_users` | 1:N | ON DELETE CASCADE |
| `employees` | `time_entries` | 1:N | ON DELETE CASCADE |
| `employees` | `leave_requests` | 1:N | ON DELETE CASCADE |
| `employees` | `employees` (manager) | 1:N | ON DELETE SET NULL |
| `departments` | `employees` | 1:N | ON DELETE RESTRICT |
| `projects` | `time_entries` | 1:N | ON DELETE SET NULL |

---

## 5. Table Specifications

### 5.1 Platform-Level Tables

#### 5.1.1 users

**Purpose:** Platform-wide user accounts (can belong to multiple tenants)

**Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  locale VARCHAR(10) DEFAULT 'es-ES',
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `email` | VARCHAR(255) | NO | Unique email address (login identifier) |
| `password_hash` | VARCHAR(255) | NO | Bcrypt hashed password |
| `first_name` | VARCHAR(100) | YES | User's first name |
| `last_name` | VARCHAR(100) | YES | User's last name |
| `phone` | VARCHAR(50) | YES | Contact phone number |
| `locale` | VARCHAR(10) | YES | Preferred language (default: es-ES) |
| `timezone` | VARCHAR(50) | YES | User's timezone (default: Europe/Madrid) |
| `mfa_enabled` | BOOLEAN | NO | Multi-factor authentication enabled |
| `mfa_secret` | VARCHAR(255) | YES | TOTP secret for MFA |
| `last_login_at` | TIMESTAMP | YES | Last successful login timestamp |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Constraints:**
- `email` must be unique
- `password_hash` must be bcrypt format (60 characters)
- `locale` must be valid locale code (e.g., es-ES, en-US)
- `timezone` must be valid IANA timezone

---

#### 5.1.2 platform_roles

**Purpose:** Platform administrator roles (superadmin access)

**Schema:**
```sql
CREATE TABLE platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE INDEX idx_platform_roles_user ON platform_roles(user_id);
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `user_id` | UUID | NO | Reference to users table |
| `role` | VARCHAR(50) | NO | Role name (e.g., 'platform_owner') |
| `created_at` | TIMESTAMP | NO | Role assignment timestamp |

**Valid Roles:**
- `platform_owner` - Full platform access

---

### 5.2 Tenant Management Tables

#### 5.2.1 tenants

**Purpose:** Tenant metadata and configuration

**Schema:**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  locale VARCHAR(10) DEFAULT 'es-ES',
  currency VARCHAR(3) DEFAULT 'EUR',
  settings JSONB,
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_plan VARCHAR(50),
  max_employees INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_deleted ON tenants(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `slug` | VARCHAR(100) | NO | Unique path identifier (e.g., 'acme' for /t/acme/) |
| `legal_name` | VARCHAR(255) | NO | Company legal name |
| `tax_id` | VARCHAR(50) | YES | Tax ID (CIF/NIF in Spain) |
| `email` | VARCHAR(255) | NO | Primary contact email |
| `phone` | VARCHAR(50) | YES | Contact phone number |
| `address` | TEXT | YES | Company address |
| `logo_url` | VARCHAR(500) | YES | URL to company logo |
| `primary_color` | VARCHAR(7) | YES | Primary brand color (hex format) |
| `secondary_color` | VARCHAR(7) | YES | Secondary brand color (hex format) |
| `timezone` | VARCHAR(50) | NO | Tenant timezone (default: Europe/Madrid) |
| `locale` | VARCHAR(10) | NO | Tenant locale (default: es-ES) |
| `currency` | VARCHAR(3) | NO | Currency code (default: EUR) |
| `settings` | JSONB | YES | Tenant-specific settings (see below) |
| `subscription_status` | VARCHAR(50) | NO | Subscription status |
| `subscription_plan` | VARCHAR(50) | YES | Subscription plan name |
| `max_employees` | INTEGER | YES | Maximum allowed employees |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Subscription Status Values:**
- `trial` - Free trial period
- `active` - Active subscription
- `suspended` - Temporarily suspended
- `cancelled` - Subscription cancelled

**Settings JSONB Structure:**
```json
{
  "workHours": {
    "standardHoursPerDay": 8,
    "standardHoursPerWeek": 40,
    "overtimeThreshold": "daily",
    "overtimeRate": 1.5
  },
  "breaks": {
    "autoDeduct": true,
    "breakMinutes": 30,
    "breakAfterHours": 6
  },
  "validation": {
    "maxHoursPerDay": 12,
    "allowOverlapping": false,
    "requireApproval": true
  },
  "compliance": {
    "jurisdiction": "ES",
    "retentionYears": 4,
    "digitalSignature": false
  },
  "branding": {
    "companyName": "Acme Corp",
    "showTorreTempoLogo": true
  }
}
```

---

#### 5.2.2 tenant_users

**Purpose:** User-tenant-role mapping (many-to-many relationship)

**Schema:**
```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  employee_id UUID REFERENCES employees(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_employee ON tenant_users(employee_id);
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `user_id` | UUID | NO | Reference to users table |
| `role` | VARCHAR(50) | NO | User's role within this tenant |
| `employee_id` | UUID | YES | Link to employee profile (if applicable) |
| `active` | BOOLEAN | NO | User active in this tenant |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |

**Valid Roles:**
- `admin` - Tenant administrator
- `hr` - HR manager
- `manager` - Team manager
- `employee` - Regular employee
- `accountant` - Read-only accountant

---

### 5.3 Employee Management Tables

#### 5.3.1 employees

**Purpose:** Employee profiles and employment information

**Schema:**
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Required fields
  employee_number VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  hire_date DATE NOT NULL,
  job_title VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id),
  contract_type VARCHAR(50) NOT NULL,
  employment_status VARCHAR(50) DEFAULT 'active',
  
  -- Optional contact fields
  phone VARCHAR(50),
  mobile VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'ES',
  
  -- Legal/compliance fields
  national_id VARCHAR(50),
  social_security_number VARCHAR(50),
  tax_id VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(2),
  
  -- Employment details
  work_schedule VARCHAR(50) DEFAULT 'full-time',
  hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  manager_id UUID REFERENCES employees(id),
  cost_center VARCHAR(50),
  
  -- System fields
  profile_photo_url VARCHAR(500),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(tenant_id, employee_number),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_status ON employees(tenant_id, employment_status);
CREATE INDEX idx_employees_department ON employees(tenant_id, department_id);
CREATE INDEX idx_employees_manager ON employees(tenant_id, manager_id);
CREATE INDEX idx_employees_email ON employees(tenant_id, email);
CREATE INDEX idx_employees_deleted ON employees(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `employee_number` | VARCHAR(50) | NO | Tenant-specific employee ID (unique per tenant) |
| `first_name` | VARCHAR(100) | NO | Employee's first name |
| `last_name` | VARCHAR(100) | NO | Employee's last name |
| `email` | VARCHAR(255) | NO | Employee email (unique per tenant) |
| `hire_date` | DATE | NO | Employment start date |
| `job_title` | VARCHAR(100) | NO | Current job title |
| `department_id` | UUID | YES | Reference to departments table |
| `contract_type` | VARCHAR(50) | NO | Employment contract type |
| `employment_status` | VARCHAR(50) | NO | Current employment status |
| `phone` | VARCHAR(50) | YES | Work phone number |
| `mobile` | VARCHAR(50) | YES | Mobile phone number |
| `address` | TEXT | YES | Home address (GDPR-sensitive) |
| `city` | VARCHAR(100) | YES | City |
| `postal_code` | VARCHAR(20) | YES | Postal code |
| `country` | VARCHAR(2) | YES | Country code (ISO 3166-1 alpha-2) |
| `national_id` | VARCHAR(50) | YES | National ID (DNI/NIE in Spain) |
| `social_security_number` | VARCHAR(50) | YES | Social security number |
| `tax_id` | VARCHAR(50) | YES | Tax ID (NIF) |
| `date_of_birth` | DATE | YES | Date of birth |
| `nationality` | VARCHAR(2) | YES | Nationality (ISO 3166-1 alpha-2) |
| `work_schedule` | VARCHAR(50) | NO | Work schedule type |
| `hours_per_week` | DECIMAL(5,2) | NO | Contracted hours per week |
| `manager_id` | UUID | YES | Reference to manager's employee record |
| `cost_center` | VARCHAR(50) | YES | Cost center code |
| `profile_photo_url` | VARCHAR(500) | YES | URL to profile photo |
| `notes` | TEXT | YES | Internal notes |
| `metadata` | JSONB | YES | Custom fields and additional data |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Contract Type Values:**
- `permanent` - Permanent contract
- `temporary` - Temporary contract
- `contractor` - Independent contractor

**Employment Status Values:**
- `active` - Currently employed
- `inactive` - Temporarily inactive
- `terminated` - Employment terminated

**Work Schedule Values:**
- `full-time` - Full-time employment
- `part-time` - Part-time employment

**Metadata JSONB Structure:**
```json
{
  "customFields": {
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+34 600 123 456",
      "relationship": "Spouse"
    },
    "uniformSize": "M",
    "parkingSpot": "A-42",
    "certifications": ["First Aid", "Forklift Operator"]
  }
}
```

---

#### 5.3.2 departments

**Purpose:** Organizational structure and department hierarchy

**Schema:**
```sql
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  manager_id UUID REFERENCES employees(id),
  parent_department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_deleted ON departments(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `name` | VARCHAR(100) | NO | Department name |
| `code` | VARCHAR(50) | YES | Department code (unique per tenant) |
| `manager_id` | UUID | YES | Reference to department manager |
| `parent_department_id` | UUID | YES | Reference to parent department (hierarchy) |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

---

### 5.4 Time Tracking Tables

#### 5.4.1 time_entries

**Purpose:** Clock in/out records for time tracking

**Schema:**
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Time tracking
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  
  -- Optional project tracking
  project_id UUID REFERENCES projects(id),
  task_description TEXT,
  
  -- Geolocation (optional)
  clock_in_location POINT,
  clock_out_location POINT,
  clock_in_ip VARCHAR(45),
  clock_out_ip VARCHAR(45),
  
  -- Approval workflow
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  -- Audit
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_time_range CHECK (clock_out IS NULL OR clock_out > clock_in),
  CONSTRAINT valid_break_minutes CHECK (break_minutes >= 0),
  CONSTRAINT valid_total_hours CHECK (total_hours IS NULL OR total_hours >= 0),
  CONSTRAINT valid_overtime_hours CHECK (overtime_hours >= 0)
);

CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_employee ON time_entries(tenant_id, employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(tenant_id, clock_in);
CREATE INDEX idx_time_entries_status ON time_entries(tenant_id, status);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_deleted ON time_entries(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `employee_id` | UUID | NO | Reference to employees table |
| `clock_in` | TIMESTAMP | NO | Clock in timestamp (UTC) |
| `clock_out` | TIMESTAMP | YES | Clock out timestamp (UTC) |
| `break_minutes` | INTEGER | NO | Break duration in minutes |
| `total_hours` | DECIMAL(5,2) | YES | Total hours worked (calculated) |
| `overtime_hours` | DECIMAL(5,2) | NO | Overtime hours (calculated) |
| `project_id` | UUID | YES | Reference to projects table |
| `task_description` | TEXT | YES | Description of work performed |
| `clock_in_location` | POINT | YES | GPS coordinates at clock in |
| `clock_out_location` | POINT | YES | GPS coordinates at clock out |
| `clock_in_ip` | VARCHAR(45) | YES | IP address at clock in |
| `clock_out_ip` | VARCHAR(45) | YES | IP address at clock out |
| `status` | VARCHAR(50) | NO | Approval status |
| `approved_by` | UUID | YES | Reference to approving user |
| `approved_at` | TIMESTAMP | YES | Approval timestamp |
| `rejection_reason` | TEXT | YES | Reason for rejection |
| `created_by` | UUID | NO | Reference to creating user |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Status Values:**
- `pending` - Awaiting approval
- `approved` - Approved by manager
- `rejected` - Rejected by manager

**Calculation Rules:**
- `total_hours` = (clock_out - clock_in) - (break_minutes / 60)
- `overtime_hours` = calculated based on tenant settings (daily or weekly threshold)

---

#### 5.4.2 leave_requests

**Purpose:** Employee leave and absence requests

**Schema:**
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2) NOT NULL,
  reason TEXT,
  
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_total_days CHECK (total_days > 0)
);

CREATE INDEX idx_leave_requests_tenant ON leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(tenant_id, employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(tenant_id, start_date, end_date);
CREATE INDEX idx_leave_requests_deleted ON leave_requests(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `employee_id` | UUID | NO | Reference to employees table |
| `leave_type` | VARCHAR(50) | NO | Type of leave |
| `start_date` | DATE | NO | Leave start date |
| `end_date` | DATE | NO | Leave end date |
| `total_days` | DECIMAL(5,2) | NO | Total days of leave (calculated) |
| `reason` | TEXT | YES | Reason for leave request |
| `status` | VARCHAR(50) | NO | Approval status |
| `approved_by` | UUID | YES | Reference to approving user |
| `approved_at` | TIMESTAMP | YES | Approval timestamp |
| `rejection_reason` | TEXT | YES | Reason for rejection |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Leave Type Values:**
- `vacation` - Paid vacation
- `sick` - Sick leave
- `personal` - Personal leave
- `maternity` - Maternity leave
- `paternity` - Paternity leave
- `unpaid` - Unpaid leave

**Status Values:**
- `pending` - Awaiting approval
- `approved` - Approved by manager
- `rejected` - Rejected by manager
- `cancelled` - Cancelled by employee

---

#### 5.4.3 projects (Optional)

**Purpose:** Project tracking for time entries

**Schema:**
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `name` | VARCHAR(255) | NO | Project name |
| `code` | VARCHAR(50) | YES | Project code (unique per tenant) |
| `description` | TEXT | YES | Project description |
| `client_name` | VARCHAR(255) | YES | Client name |
| `status` | VARCHAR(50) | NO | Project status |
| `start_date` | DATE | YES | Project start date |
| `end_date` | DATE | YES | Project end date |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Status Values:**
- `active` - Active project
- `completed` - Completed project
- `archived` - Archived project

---

### 5.5 Advanced Scheduling Tables

#### 5.5.1 schedules

**Purpose:** Weekly/monthly schedule drafts, published schedules, locked schedules

**Schema:**
```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Schedule period
  name VARCHAR(255) NOT NULL, -- e.g., "Week 5 - January 2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Publishing workflow
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'locked'
  published_at TIMESTAMP,
  published_by UUID REFERENCES users(id),
  locked_at TIMESTAMP,
  locked_by UUID REFERENCES users(id),
  lock_reason TEXT, -- Required when locking
  
  -- Metadata
  notes TEXT,
  metadata JSONB, -- Custom fields, copied_from_schedule_id, etc.
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_schedules_tenant ON schedules(tenant_id);
CREATE INDEX idx_schedules_status ON schedules(tenant_id, status);
CREATE INDEX idx_schedules_dates ON schedules(tenant_id, start_date, end_date);
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `name` | VARCHAR(255) | NO | Schedule name (e.g., "Week 5 - January 2026") |
| `start_date` | DATE | NO | Schedule period start date |
| `end_date` | DATE | NO | Schedule period end date |
| `status` | VARCHAR(20) | NO | Schedule status (draft/published/locked) |
| `published_at` | TIMESTAMP | YES | When schedule was published |
| `published_by` | UUID | YES | User who published the schedule |
| `locked_at` | TIMESTAMP | YES | When schedule was locked |
| `locked_by` | UUID | YES | User who locked the schedule |
| `lock_reason` | TEXT | YES | Reason for locking (required when locked) |
| `notes` | TEXT | YES | Internal notes |
| `metadata` | JSONB | YES | Custom fields, copied_from_schedule_id, etc. |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `created_by` | UUID | NO | User who created the schedule |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Status Values:**
- `draft` - Draft schedule (editable, conflicts allowed)
- `published` - Published schedule (visible to employees, conflicts must be resolved)
- `locked` - Locked schedule (read-only, requires unlock with reason)

**Business Rules:**
- Only ONE schedule per tenant can be in 'published' status for overlapping date ranges
- Draft schedules can have conflicts (detection warnings only)
- Published schedules MUST have conflicts resolved before publish
- Locked schedules cannot be edited (unlock requires manager permission + reason)

---

#### 5.5.2 shifts

**Purpose:** Individual shift instances within a schedule

**Schema:**
```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Work details
  role VARCHAR(100), -- e.g., "Bartender", "Chef"
  location VARCHAR(255), -- e.g., "Bar Area", "Kitchen"
  work_center VARCHAR(255), -- Optional: "Lakeside Murcia"
  
  -- Assignment
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assignment_status VARCHAR(20) DEFAULT 'unassigned', -- 'unassigned', 'assigned', 'accepted', 'swapped'
  
  -- Conflict detection
  has_conflicts BOOLEAN DEFAULT false,
  conflict_details JSONB, -- Array of conflict descriptions
  
  -- Metadata
  color VARCHAR(7), -- Hex color for UI (e.g., "#3B82F6")
  notes TEXT,
  metadata JSONB, -- Custom fields
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_schedule ON shifts(tenant_id, schedule_id);
CREATE INDEX idx_shifts_employee ON shifts(tenant_id, employee_id);
CREATE INDEX idx_shifts_timing ON shifts(tenant_id, start_time, end_time);
CREATE INDEX idx_shifts_role ON shifts(tenant_id, role);
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `schedule_id` | UUID | NO | Reference to schedules table |
| `start_time` | TIMESTAMP | NO | Shift start time (UTC) |
| `end_time` | TIMESTAMP | NO | Shift end time (UTC) |
| `break_minutes` | INTEGER | NO | Break duration in minutes |
| `role` | VARCHAR(100) | YES | Role for this shift (e.g., "Bartender") |
| `location` | VARCHAR(255) | YES | Location within work center |
| `work_center` | VARCHAR(255) | YES | Work center name |
| `employee_id` | UUID | YES | Assigned employee |
| `assignment_status` | VARCHAR(20) | NO | Assignment status |
| `has_conflicts` | BOOLEAN | NO | Whether shift has conflicts |
| `conflict_details` | JSONB | YES | Array of conflict descriptions |
| `color` | VARCHAR(7) | YES | Hex color for UI display |
| `notes` | TEXT | YES | Shift notes |
| `metadata` | JSONB | YES | Custom fields |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Assignment Status Values:**
- `unassigned` - No employee assigned
- `assigned` - Employee assigned, pending acceptance
- `accepted` - Employee accepted the shift
- `swapped` - Shift was swapped to another employee

**Business Rules:**
- Shifts cannot exceed 12 hours (configurable per tenant)
- Break time is unpaid by default (configurable)
- Overlapping shifts for same employee = conflict
- Shifts inherit parent schedule's status (cannot edit shifts in locked schedule)

---

#### 5.5.3 shift_assignments

**Purpose:** Track assignment history and swaps

**Schema:**
```sql
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  
  -- Assignment
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'swapped'
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  
  -- Swap tracking
  swapped_to_employee_id UUID REFERENCES employees(id),
  swap_requested_at TIMESTAMP,
  swap_approved_by UUID REFERENCES users(id),
  swap_approved_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_status ON shift_assignments(tenant_id, status);
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `shift_id` | UUID | NO | Reference to shifts table |
| `employee_id` | UUID | NO | Assigned employee |
| `assigned_by` | UUID | NO | User who made the assignment |
| `assigned_at` | TIMESTAMP | NO | Assignment timestamp |
| `status` | VARCHAR(20) | NO | Assignment status |
| `accepted_at` | TIMESTAMP | YES | When employee accepted |
| `declined_at` | TIMESTAMP | YES | When employee declined |
| `decline_reason` | TEXT | YES | Reason for declining |
| `swapped_to_employee_id` | UUID | YES | Employee shift was swapped to |
| `swap_requested_at` | TIMESTAMP | YES | When swap was requested |
| `swap_approved_by` | UUID | YES | Manager who approved swap |
| `swap_approved_at` | TIMESTAMP | YES | When swap was approved |
| `notes` | TEXT | YES | Assignment notes |
| `metadata` | JSONB | YES | Custom fields |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |

**Status Values:**
- `pending` - Assignment pending employee acceptance
- `accepted` - Employee accepted the assignment
- `declined` - Employee declined the assignment
- `swapped` - Assignment was swapped to another employee

**Business Rules:**
- Immutable log (no updates, only inserts)
- Latest assignment per shift_id = current assignment
- Swap requires manager approval
- Declined assignments remain in log for audit

---

### 5.6 Module Management Tables

#### 5.6.1 tenant_modules

**Purpose:** Track enabled add-on modules per tenant (SaaS monetization)

**Schema:**
```sql
CREATE TABLE tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Module identification
  module_key VARCHAR(50) NOT NULL, -- 'advanced_scheduling', 'compliance_pack', 'approvals', 'geo_verification', 'analytics', 'api_access', 'white_label'
  
  -- Enablement
  enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enabled_by UUID REFERENCES users(id),
  disabled_at TIMESTAMP,
  disabled_by UUID REFERENCES users(id),
  
  -- Trial tracking
  trial_until TIMESTAMP, -- NULL = not a trial
  trial_started_at TIMESTAMP,
  
  -- Module-specific configuration
  config JSONB, -- Module-specific settings
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(tenant_id, module_key)
);

CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_enabled ON tenant_modules(tenant_id, enabled);
CREATE INDEX idx_tenant_modules_trial ON tenant_modules(trial_until) WHERE trial_until IS NOT NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `module_key` | VARCHAR(50) | NO | Module identifier |
| `enabled` | BOOLEAN | NO | Whether module is enabled |
| `enabled_at` | TIMESTAMP | NO | When module was enabled |
| `enabled_by` | UUID | YES | User who enabled the module |
| `disabled_at` | TIMESTAMP | YES | When module was disabled |
| `disabled_by` | UUID | YES | User who disabled the module |
| `trial_until` | TIMESTAMP | YES | Trial expiration date (NULL = not a trial) |
| `trial_started_at` | TIMESTAMP | YES | When trial started |
| `config` | JSONB | YES | Module-specific configuration |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |

**Module Keys:**
- `advanced_scheduling` - Deputy-style scheduling
- `compliance_pack` - Signed exports, inspector-ready bundles
- `approvals` - Approvals & corrections workflow
- `geo_verification` - Geofencing, location verification
- `analytics` - Advanced reports, insights
- `api_access` - RESTful API access
- `white_label` - Custom branding

**Business Rules:**
- Core features always enabled (not in this table)
- Module config stored as JSONB for flexibility
- Trial expiry handled by backend cron job
- Disabling a module soft-deletes access, preserves data

---

### 5.7 Compliance & Legal Tables

#### 5.7.1 compliance_documents

**Purpose:** Store DPIA, privacy notices, Works Council agreements

**Schema:**
```sql
CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Document classification
  type VARCHAR(50) NOT NULL, -- 'dpia', 'privacy_notice', 'works_council_agreement', 'geolocation_policy'
  title VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL, -- e.g., "1.0", "2024-01"
  
  -- Content
  content TEXT, -- Markdown or plain text
  content_html TEXT, -- Rendered HTML
  metadata JSONB, -- Structured data (e.g., DPIA checklist responses)
  
  -- File attachment (optional)
  file_url TEXT, -- S3/storage URL for PDF upload
  file_size_bytes INTEGER,
  file_mime_type VARCHAR(100),
  
  -- Lifecycle
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP, -- Admin acknowledged compliance document
  acknowledged_by UUID REFERENCES users(id),
  expires_at TIMESTAMP, -- For time-limited compliance docs
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_compliance_docs_tenant ON compliance_documents(tenant_id);
CREATE INDEX idx_compliance_docs_type ON compliance_documents(tenant_id, type);
CREATE INDEX idx_compliance_docs_version ON compliance_documents(tenant_id, type, version);
CREATE INDEX idx_compliance_docs_expires ON compliance_documents(expires_at) WHERE expires_at IS NOT NULL;
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | NO | Reference to tenants table |
| `type` | VARCHAR(50) | NO | Document type |
| `title` | VARCHAR(255) | NO | Document title |
| `version` | VARCHAR(20) | NO | Document version |
| `content` | TEXT | YES | Markdown or plain text content |
| `content_html` | TEXT | YES | Rendered HTML content |
| `metadata` | JSONB | YES | Structured data (e.g., DPIA checklist) |
| `file_url` | TEXT | YES | S3/storage URL for PDF upload |
| `file_size_bytes` | INTEGER | YES | File size in bytes |
| `file_mime_type` | VARCHAR(100) | YES | MIME type of uploaded file |
| `generated_at` | TIMESTAMP | NO | When document was generated |
| `generated_by` | UUID | YES | User who generated the document |
| `acknowledged_at` | TIMESTAMP | YES | When admin acknowledged document |
| `acknowledged_by` | UUID | YES | User who acknowledged document |
| `expires_at` | TIMESTAMP | YES | Expiration date for time-limited docs |
| `created_at` | TIMESTAMP | NO | Record creation timestamp |
| `updated_at` | TIMESTAMP | NO | Last update timestamp |
| `deleted_at` | TIMESTAMP | YES | Soft delete timestamp |

**Document Types:**
- `dpia` - Data Protection Impact Assessment (required for geolocation)
- `privacy_notice` - Employee-facing privacy policy
- `works_council_agreement` - Consultation agreement
- `geolocation_policy` - Written policy explaining geolocation use

**Business Rules:**
- DPIA required before enabling geolocation module
- Privacy notice must be acknowledged by admin before tenant goes live
- Version control via version field (no edits, only new versions)
- Expired documents flagged for renewal

---

### 5.8 Audit and Compliance Tables

#### 5.5.1 audit_logs

**Purpose:** Comprehensive audit trail for all data modifications

**Schema:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

**Fields:**

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID | NO | Primary key |
| `tenant_id` | UUID | YES | Reference to tenants table (NULL for platform events) |
| `user_id` | UUID | YES | Reference to users table |
| `action` | VARCHAR(100) | NO | Action performed |
| `entity_type` | VARCHAR(100) | YES | Type of entity modified |
| `entity_id` | UUID | YES | ID of entity modified |
| `changes` | JSONB | YES | Before/after values |
| `ip_address` | VARCHAR(45) | YES | IP address of request |
| `user_agent` | TEXT | YES | User agent string |
| `created_at` | TIMESTAMP | NO | Audit log timestamp |

**Action Values:**
- `create` - Entity created
- `update` - Entity updated
- `delete` - Entity deleted
- `login` - User login
- `logout` - User logout
- `export` - Data export
- `approve` - Approval action
- `reject` - Rejection action

**Entity Type Values:**
- `employee` - Employee record
- `time_entry` - Time entry record
- `leave_request` - Leave request record
- `tenant` - Tenant record
- `user` - User record
- `department` - Department record
- `project` - Project record

**Changes JSONB Structure:**
```json
{
  "before": {
    "jobTitle": "Developer",
    "departmentId": "old-dept-uuid"
  },
  "after": {
    "jobTitle": "Senior Developer",
    "departmentId": "new-dept-uuid"
  }
}
```

---

## 6. Indexes and Performance

### 6.1 Index Strategy

**Primary Indexes:**
- All tables have UUID primary keys with default B-tree indexes
- Composite indexes on `(tenant_id, id)` for tenant-scoped tables

**Query Optimization Indexes:**
- Foreign key columns (e.g., `employee_id`, `department_id`)
- Frequently filtered columns (e.g., `status`, `employment_status`)
- Date range columns (e.g., `clock_in`, `start_date`)
- Unique constraints (e.g., `email`, `employee_number`)

**Partial Indexes:**
- Soft delete filtering: `WHERE deleted_at IS NULL`

### 6.2 Index Listing

| Table | Index Name | Columns | Type | Purpose |
|-------|------------|---------|------|---------|
| `users` | `idx_users_email` | `email` | B-tree | Login lookup |
| `users` | `idx_users_deleted` | `deleted_at` | Partial | Active users |
| `tenants` | `idx_tenants_slug` | `slug` | B-tree | Tenant slug lookup |
| `tenants` | `idx_tenants_status` | `subscription_status` | B-tree | Status filtering |
| `tenant_users` | `idx_tenant_users_tenant` | `tenant_id` | B-tree | Tenant lookup |
| `tenant_users` | `idx_tenant_users_user` | `user_id` | B-tree | User lookup |
| `employees` | `idx_employees_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `employees` | `idx_employees_status` | `tenant_id, employment_status` | Composite | Status filtering |
| `employees` | `idx_employees_department` | `tenant_id, department_id` | Composite | Department filtering |
| `employees` | `idx_employees_email` | `tenant_id, email` | Composite | Email lookup |
| `time_entries` | `idx_time_entries_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `time_entries` | `idx_time_entries_employee` | `tenant_id, employee_id` | Composite | Employee filtering |
| `time_entries` | `idx_time_entries_date` | `tenant_id, clock_in` | Composite | Date range queries |
| `time_entries` | `idx_time_entries_status` | `tenant_id, status` | Composite | Status filtering |
| `leave_requests` | `idx_leave_requests_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `leave_requests` | `idx_leave_requests_employee` | `tenant_id, employee_id` | Composite | Employee filtering |
| `leave_requests` | `idx_leave_requests_dates` | `tenant_id, start_date, end_date` | Composite | Date range queries |
| `audit_logs` | `idx_audit_logs_tenant` | `tenant_id` | B-tree | Tenant filtering |
| `audit_logs` | `idx_audit_logs_entity` | `entity_type, entity_id` | Composite | Entity lookup |
| `audit_logs` | `idx_audit_logs_created` | `created_at` | B-tree | Time-based queries |
| `schedules` | `idx_schedules_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `schedules` | `idx_schedules_status` | `tenant_id, status` | Composite | Status filtering |
| `schedules` | `idx_schedules_dates` | `tenant_id, start_date, end_date` | Composite | Date range queries |
| `shifts` | `idx_shifts_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `shifts` | `idx_shifts_schedule` | `tenant_id, schedule_id` | Composite | Schedule filtering |
| `shifts` | `idx_shifts_employee` | `tenant_id, employee_id` | Composite | Employee filtering |
| `shifts` | `idx_shifts_timing` | `tenant_id, start_time, end_time` | Composite | Time range queries |
| `shifts` | `idx_shifts_role` | `tenant_id, role` | Composite | Role filtering |
| `shift_assignments` | `idx_shift_assignments_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `shift_assignments` | `idx_shift_assignments_shift` | `shift_id` | B-tree | Shift lookup |
| `shift_assignments` | `idx_shift_assignments_employee` | `employee_id` | B-tree | Employee lookup |
| `shift_assignments` | `idx_shift_assignments_status` | `tenant_id, status` | Composite | Status filtering |
| `tenant_modules` | `idx_tenant_modules_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `tenant_modules` | `idx_tenant_modules_enabled` | `tenant_id, enabled` | Composite | Enabled modules |
| `tenant_modules` | `idx_tenant_modules_trial` | `trial_until` | Partial | Trial expiry tracking |
| `compliance_documents` | `idx_compliance_docs_tenant` | `tenant_id` | B-tree | Tenant isolation |
| `compliance_documents` | `idx_compliance_docs_type` | `tenant_id, type` | Composite | Document type filtering |
| `compliance_documents` | `idx_compliance_docs_version` | `tenant_id, type, version` | Composite | Version lookup |
| `compliance_documents` | `idx_compliance_docs_expires` | `expires_at` | Partial | Expiration tracking |

### 6.3 Performance Considerations

**Query Patterns:**
1. **Tenant Isolation:** All queries include `WHERE tenant_id = ?` - composite indexes ensure efficient filtering
2. **Date Range Queries:** Time entries and leave requests frequently queried by date range
3. **Status Filtering:** Approval workflows require efficient status filtering
4. **Soft Deletes:** Partial indexes on `deleted_at IS NULL` improve active record queries

**Optimization Recommendations:**
- Use `EXPLAIN ANALYZE` to verify index usage
- Monitor slow query log for optimization opportunities
- Consider partitioning `time_entries` and `audit_logs` by date for large tenants
- Implement connection pooling (recommended: 20-50 connections)

---

## 7. Data Integrity and Constraints

### 7.1 Primary Key Constraints

All tables use UUID primary keys:
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

**Benefits:**
- Globally unique identifiers
- No sequential ID leakage
- Distributed system friendly
- Merge-friendly for future sharding

### 7.2 Foreign Key Constraints

**Cascade Rules:**

| Constraint | Rule | Rationale |
|------------|------|-----------|
| `tenants → employees` | ON DELETE CASCADE | Delete all employee data when tenant deleted |
| `tenants → time_entries` | ON DELETE CASCADE | Delete all time entries when tenant deleted |
| `employees → time_entries` | ON DELETE CASCADE | Delete time entries when employee deleted |
| `employees → employees (manager)` | ON DELETE SET NULL | Preserve employee record if manager deleted |
| `departments → employees` | ON DELETE RESTRICT | Prevent department deletion if employees exist |
| `projects → time_entries` | ON DELETE SET NULL | Preserve time entry if project deleted |

### 7.3 Unique Constraints

| Table | Columns | Scope |
|-------|---------|-------|
| `users` | `email` | Global |
| `tenants` | `slug` | Global |
| `tenant_users` | `tenant_id, user_id` | Per tenant |
| `employees` | `tenant_id, employee_number` | Per tenant |
| `employees` | `tenant_id, email` | Per tenant |
| `departments` | `tenant_id, code` | Per tenant |
| `projects` | `tenant_id, code` | Per tenant |

### 7.4 Check Constraints

**Time Entries:**
```sql
CONSTRAINT valid_time_range CHECK (clock_out IS NULL OR clock_out > clock_in)
CONSTRAINT valid_break_minutes CHECK (break_minutes >= 0)
CONSTRAINT valid_total_hours CHECK (total_hours IS NULL OR total_hours >= 0)
CONSTRAINT valid_overtime_hours CHECK (overtime_hours >= 0)
```

**Leave Requests:**
```sql
CONSTRAINT valid_date_range CHECK (end_date >= start_date)
CONSTRAINT valid_total_days CHECK (total_days > 0)
```

### 7.5 Not Null Constraints

**Critical Fields:**
- All `id` columns (primary keys)
- All `tenant_id` columns (multi-tenancy enforcement)
- All `created_at` columns (audit trail)
- Required business fields (e.g., `employee_number`, `first_name`, `email`)

---

## 8. Data Validation Rules

### 8.1 Application-Level Validation

**Email Validation:**
- Format: RFC 5322 compliant
- Uniqueness: Per tenant for employees, global for users
- Example: `juan.garcia@acme.com`

**Phone Number Validation:**
- Format: E.164 international format recommended
- Example: `+34 600 123 456`

**Date Validation:**
- `hire_date`: Cannot be in the future
- `date_of_birth`: Must be at least 16 years ago (legal working age)
- `clock_in`: Cannot be in the future
- `start_date` (leave): Cannot be in the past

**Time Range Validation:**
- `clock_out` must be after `clock_in`
- `end_date` must be >= `start_date`
- Maximum hours per day: Configurable per tenant (default: 12)

**String Length Validation:**
- `employee_number`: 1-50 characters
- `first_name`, `last_name`: 1-100 characters
- `email`: Valid email format, max 255 characters
- `job_title`: 1-100 characters
- `task_description`: Max 1000 characters

### 8.2 Business Rule Validation

**Time Entries:**
1. Cannot clock in if already clocked in (active entry exists)
2. Cannot have overlapping time entries (if configured)
3. Automatic break deduction after configured hours
4. Overtime calculation based on tenant settings

**Leave Requests:**
1. Cannot overlap with existing approved leave
2. Total days calculated excluding weekends
3. Cannot request leave in the past

**Employees:**
1. `employee_number` must be unique per tenant
2. `email` must be unique per tenant
3. `manager_id` cannot reference self
4. `department_id` must exist

### 8.3 Data Type Validation

| Field Type | Validation Rule |
|------------|-----------------|
| UUID | Valid UUID v4 format |
| VARCHAR | Max length enforced |
| DATE | Valid date format (YYYY-MM-DD) |
| TIMESTAMP | Valid ISO 8601 timestamp |
| DECIMAL(5,2) | Max 999.99 |
| INTEGER | 32-bit signed integer |
| BOOLEAN | true/false |
| JSONB | Valid JSON format |
| POINT | Valid PostGIS point (lat, lon) |

---

## 9. Migration Strategy

### 9.1 Initial Schema Creation

**Order of Execution:**
1. Create extensions (uuid-ossp, pgcrypto, postgis if needed)
2. Create platform-level tables (users, platform_roles)
3. Create tenant management tables (tenants, tenant_users)
4. Create employee management tables (departments, employees)
5. Create time tracking tables (projects, time_entries, leave_requests)
6. Create audit tables (audit_logs)
7. Create indexes
8. Create constraints

### 9.2 Migration Tools

**Recommended:** Knex.js or Sequelize migrations

**Example Migration Structure:**
```
migrations/
├── 001_create_users_table.js
├── 002_create_tenants_table.js
├── 003_create_employees_table.js
├── 004_create_time_entries_table.js
├── 005_create_leave_requests_table.js
├── 006_create_audit_logs_table.js
└── 007_create_indexes.js
```

### 9.3 Rollback Strategy

All migrations must include:
- `up()` function - Apply migration
- `down()` function - Rollback migration

**Example:**
```javascript
exports.up = function(knex) {
  return knex.schema.createTable('employees', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    // ... columns
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('employees');
};
```

### 9.4 Data Migration

**Tenant Onboarding:**
1. Create tenant record
2. Create admin user (if new)
3. Create tenant_user mapping
4. Import employees (CSV or manual)
5. Create departments
6. Assign employees to departments

**Data Import Validation:**
- Validate all required fields
- Check for duplicates
- Verify foreign key references
- Log import errors for review

---

## 10. Data Retention and Archival

### 10.1 Retention Policies

**Legal Requirements (Spain):**
- Time entries: 4 years (Royal Decree 8/2019)
- Employee records: 4 years after termination
- Audit logs: 4 years minimum

**Configurable Retention:**
- Tenants can configure retention period (default: 4 years)
- Platform enforces minimum retention for compliance

### 10.2 Soft Delete Pattern

**Implementation:**
All tables include `deleted_at` timestamp:
```sql
deleted_at TIMESTAMP
```

**Behavior:**
- DELETE operations set `deleted_at = NOW()`
- Queries filter `WHERE deleted_at IS NULL`
- Soft-deleted records retained for audit/compliance
- Hard delete only after retention period expires

### 10.3 Archival Strategy

**Automated Archival Process:**
1. Identify records older than retention period
2. Export to cold storage (S3-compatible)
3. Hard delete from primary database
4. Maintain archival index for retrieval

**Archival Tables:**
- `time_entries_archive`
- `employees_archive`
- `audit_logs_archive`

**Archival Schedule:**
- Monthly job to archive old records
- Retention period: Configurable per tenant (default: 4 years)

### 10.4 GDPR Compliance

**Right to Erasure:**
- Employee requests deletion via HR
- HR initiates deletion process
- System soft-deletes employee record
- After retention period, hard delete
- Exception: Time entries retained for legal compliance (4 years)

**Data Portability:**
- Employees can export their own data (JSON/CSV)
- Export includes: profile, time entries, leave requests
- Automated export via API endpoint

**Data Minimization:**
- Only collect necessary fields
- Optional fields clearly marked
- Metadata JSONB for extensibility without schema changes

---

## Appendix A: SQL Schema Creation Script

```sql
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- CREATE EXTENSION IF NOT EXISTS "postgis"; -- Optional for geolocation

-- Platform-level tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  locale VARCHAR(10) DEFAULT 'es-ES',
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Tenant management tables
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  legal_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  logo_url VARCHAR(500),
  primary_color VARCHAR(7),
  secondary_color VARCHAR(7),
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  locale VARCHAR(10) DEFAULT 'es-ES',
  currency VARCHAR(3) DEFAULT 'EUR',
  settings JSONB,
  subscription_status VARCHAR(50) DEFAULT 'active',
  subscription_plan VARCHAR(50),
  max_employees INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  employee_id UUID,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Employee management tables
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50),
  manager_id UUID,
  parent_department_id UUID REFERENCES departments(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, code)
);

CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_number VARCHAR(50) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  hire_date DATE NOT NULL,
  job_title VARCHAR(100) NOT NULL,
  department_id UUID REFERENCES departments(id),
  contract_type VARCHAR(50) NOT NULL,
  employment_status VARCHAR(50) DEFAULT 'active',
  phone VARCHAR(50),
  mobile VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'ES',
  national_id VARCHAR(50),
  social_security_number VARCHAR(50),
  tax_id VARCHAR(50),
  date_of_birth DATE,
  nationality VARCHAR(2),
  work_schedule VARCHAR(50) DEFAULT 'full-time',
  hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  manager_id UUID REFERENCES employees(id),
  cost_center VARCHAR(50),
  profile_photo_url VARCHAR(500),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, employee_number),
  UNIQUE(tenant_id, email)
);

-- Add foreign key for department manager after employees table exists
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
  FOREIGN KEY (manager_id) REFERENCES employees(id);

-- Add foreign key for tenant_users employee_id after employees table exists
ALTER TABLE tenant_users ADD CONSTRAINT fk_tenant_users_employee 
  FOREIGN KEY (employee_id) REFERENCES employees(id);

-- Time tracking tables
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  description TEXT,
  client_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  UNIQUE(tenant_id, code)
);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP NOT NULL,
  clock_out TIMESTAMP,
  break_minutes INTEGER DEFAULT 0,
  total_hours DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  project_id UUID REFERENCES projects(id),
  task_description TEXT,
  clock_in_location POINT,
  clock_out_location POINT,
  clock_in_ip VARCHAR(45),
  clock_out_ip VARCHAR(45),
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT valid_time_range CHECK (clock_out IS NULL OR clock_out > clock_in),
  CONSTRAINT valid_break_minutes CHECK (break_minutes >= 0),
  CONSTRAINT valid_total_hours CHECK (total_hours IS NULL OR total_hours >= 0),
  CONSTRAINT valid_overtime_hours CHECK (overtime_hours >= 0)
);

CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(5,2) NOT NULL,
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  CONSTRAINT valid_total_days CHECK (total_days > 0)
);

-- Audit and compliance tables
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create all indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_platform_roles_user ON platform_roles(user_id);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_deleted ON tenants(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_employee ON tenant_users(employee_id);

CREATE INDEX idx_departments_tenant ON departments(tenant_id);
CREATE INDEX idx_departments_parent ON departments(parent_department_id);
CREATE INDEX idx_departments_deleted ON departments(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_status ON employees(tenant_id, employment_status);
CREATE INDEX idx_employees_department ON employees(tenant_id, department_id);
CREATE INDEX idx_employees_manager ON employees(tenant_id, manager_id);
CREATE INDEX idx_employees_email ON employees(tenant_id, email);
CREATE INDEX idx_employees_deleted ON employees(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_projects_tenant ON projects(tenant_id);
CREATE INDEX idx_projects_status ON projects(tenant_id, status);
CREATE INDEX idx_projects_deleted ON projects(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_employee ON time_entries(tenant_id, employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(tenant_id, clock_in);
CREATE INDEX idx_time_entries_status ON time_entries(tenant_id, status);
CREATE INDEX idx_time_entries_project ON time_entries(project_id);
CREATE INDEX idx_time_entries_deleted ON time_entries(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_leave_requests_tenant ON leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_employee ON leave_requests(tenant_id, employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_dates ON leave_requests(tenant_id, start_date, end_date);
CREATE INDEX idx_leave_requests_deleted ON leave_requests(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- Advanced Scheduling tables
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP,
  published_by UUID REFERENCES users(id),
  locked_at TIMESTAMP,
  locked_by UUID REFERENCES users(id),
  lock_reason TEXT,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  role VARCHAR(100),
  location VARCHAR(255),
  work_center VARCHAR(255),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assignment_status VARCHAR(20) DEFAULT 'unassigned',
  has_conflicts BOOLEAN DEFAULT false,
  conflict_details JSONB,
  color VARCHAR(7),
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  swapped_to_employee_id UUID REFERENCES employees(id),
  swap_requested_at TIMESTAMP,
  swap_approved_by UUID REFERENCES users(id),
  swap_approved_at TIMESTAMP,
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Module Management tables
CREATE TABLE tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key VARCHAR(50) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  enabled_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  enabled_by UUID REFERENCES users(id),
  disabled_at TIMESTAMP,
  disabled_by UUID REFERENCES users(id),
  trial_until TIMESTAMP,
  trial_started_at TIMESTAMP,
  config JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, module_key)
);

-- Compliance & Legal tables
CREATE TABLE compliance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL,
  content TEXT,
  content_html TEXT,
  metadata JSONB,
  file_url TEXT,
  file_size_bytes INTEGER,
  file_mime_type VARCHAR(100),
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generated_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID REFERENCES users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX idx_schedules_tenant ON schedules(tenant_id);
CREATE INDEX idx_schedules_status ON schedules(tenant_id, status);
CREATE INDEX idx_schedules_dates ON schedules(tenant_id, start_date, end_date);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_schedule ON shifts(tenant_id, schedule_id);
CREATE INDEX idx_shifts_employee ON shifts(tenant_id, employee_id);
CREATE INDEX idx_shifts_timing ON shifts(tenant_id, start_time, end_time);
CREATE INDEX idx_shifts_role ON shifts(tenant_id, role);

CREATE INDEX idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_status ON shift_assignments(tenant_id, status);

CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_enabled ON tenant_modules(tenant_id, enabled);
CREATE INDEX idx_tenant_modules_trial ON tenant_modules(trial_until) WHERE trial_until IS NOT NULL;

CREATE INDEX idx_compliance_docs_tenant ON compliance_documents(tenant_id);
CREATE INDEX idx_compliance_docs_type ON compliance_documents(tenant_id, type);
CREATE INDEX idx_compliance_docs_version ON compliance_documents(tenant_id, type, version);
CREATE INDEX idx_compliance_docs_expires ON compliance_documents(expires_at) WHERE expires_at IS NOT NULL;
```

---

## Appendix B: Common Query Patterns

### B.1 Tenant-Scoped Queries

**List Active Employees:**
```sql
SELECT * FROM employees 
WHERE tenant_id = ? 
  AND employment_status = 'active' 
  AND deleted_at IS NULL
ORDER BY last_name, first_name;
```

**Get Time Entries for Date Range:**
```sql
SELECT te.*, e.first_name, e.last_name 
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
WHERE te.tenant_id = ?
  AND te.clock_in >= ?
  AND te.clock_in < ?
  AND te.deleted_at IS NULL
ORDER BY te.clock_in DESC;
```

**Get Pending Approvals for Manager:**
```sql
SELECT te.*, e.first_name, e.last_name
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
WHERE te.tenant_id = ?
  AND e.manager_id = ?
  AND te.status = 'pending'
  AND te.deleted_at IS NULL
ORDER BY te.created_at ASC;
```

### B.2 Reporting Queries

**Monthly Hours Summary:**
```sql
SELECT 
  e.employee_number,
  e.first_name,
  e.last_name,
  SUM(te.total_hours) as total_hours,
  SUM(te.overtime_hours) as overtime_hours
FROM time_entries te
JOIN employees e ON te.employee_id = e.id
WHERE te.tenant_id = ?
  AND te.clock_in >= ?
  AND te.clock_in < ?
  AND te.status = 'approved'
  AND te.deleted_at IS NULL
GROUP BY e.id, e.employee_number, e.first_name, e.last_name
ORDER BY e.last_name, e.first_name;
```

**Leave Balance Report:**
```sql
SELECT 
  e.employee_number,
  e.first_name,
  e.last_name,
  lr.leave_type,
  SUM(lr.total_days) as days_taken
FROM leave_requests lr
JOIN employees e ON lr.employee_id = e.id
WHERE lr.tenant_id = ?
  AND lr.status = 'approved'
  AND EXTRACT(YEAR FROM lr.start_date) = ?
  AND lr.deleted_at IS NULL
GROUP BY e.id, e.employee_number, e.first_name, e.last_name, lr.leave_type
ORDER BY e.last_name, e.first_name, lr.leave_type;
```

---

**End of Data Model Documentation**
