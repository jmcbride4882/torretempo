# Torre Tempo - Authoritative Product Specification

**Version:** 2.0 (Final Lock)  
**Date:** February 1, 2026  
**Status:** ✅ **LOCKED - Authoritative Specification**  
**Project:** Multi-Tenant SaaS Time Tracking & Scheduling System

---

## Document Authority

This document represents the **final, authoritative product specification** for Torre Tempo. All architectural decisions, feature definitions, and compliance requirements documented herein are **locked and binding** unless explicitly overridden by the product owner.

**Key Principles:**
- **Compliance First:** Spanish labor law (RDL 8/2019) and GDPR/LOPDGDD compliance is non-negotiable
- **SaaS-Ready from Day One:** Multi-tenant architecture with modular monetization strategy
- **No Code Changes for Configuration:** Everything tenant-customizable via UI
- **Legally Defensible:** All features designed for labor inspection readiness

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Final Product Decisions](#2-final-product-decisions)
3. [System Architecture](#3-system-architecture)
4. [Multi-Tenancy Architecture](#4-multi-tenancy-architecture)
5. [Core Product (Always Included)](#5-core-product-always-included)
6. [Add-On Modules (Sellable)](#6-add-on-modules-sellable)
7. [Geolocation & Compliance](#7-geolocation--compliance)
8. [Data Model](#8-data-model)
9. [UI Configuration System](#9-ui-configuration-system)
10. [Security & Authorization](#10-security--authorization)
11. [API Architecture](#11-api-architecture)
12. [Deployment Architecture](#12-deployment-architecture)
13. [Technology Stack](#13-technology-stack)

---

## 1. Executive Summary

### 1.1 Project Overview

**Torre Tempo** is a production-grade, multi-tenant SaaS time tracking and scheduling system designed specifically for **Spanish compliance** (Royal Decree-Law 8/2019, GDPR/LOPDGDD) with a modular monetization strategy.

**Primary Market:** Hospitality sector in Spain (bars, restaurants, leisure venues)  
**SaaS Strategy:** General-purpose platform, hospitality-optimized, adaptable to any industry

### 1.2 Core Value Propositions

**For Employers:**
- ✅ **Zero compliance risk** - passes labor inspections out-of-the-box
- ✅ **Deputy-style scheduling** - visual drag-and-drop shift management (paid add-on)
- ✅ **Complete audit trail** - append-only, immutable, legally defensible
- ✅ **4-year retention** - automatic compliance with retention requirements

**For Employees:**
- ✅ **Self-service access** - view own records anytime, anywhere
- ✅ **Mobile-first** - clock in/out from mobile with offline support
- ✅ **Transparent geolocation** - see when/where location is captured
- ✅ **Fair correction workflow** - request changes with approval trail

**For SaaS Business:**
- ✅ **Modular upsell strategy** - Core + 7 paid add-on modules
- ✅ **No per-tenant code changes** - everything configurable via UI
- ✅ **Rapid tenant onboarding** - CSV import, automated setup
- ✅ **White-label ready** - full branding customization (paid add-on)

### 1.3 Market Differentiation

| Feature | Torre Tempo | Competitors |
|---------|-------------|-------------|
| Spain GDPR/LOPDGDD compliance | ✅ Built-in, legally reviewed | ⚠️ Generic, not Spain-specific |
| Event-only geolocation | ✅ AEPD-compliant by design | ❌ Often continuous tracking |
| Deputy-style scheduling | ✅ Flagship feature | ❌ Missing or basic |
| Inspector-ready exports | ✅ Signed PDF bundles (add-on) | ⚠️ Basic PDF only |
| Append-only audit | ✅ Immutable, correction trail | ❌ Editable records |
| Multi-tenant SaaS | ✅ From day one | ⚠️ Single-tenant or retrofit |

---

## 2. Final Product Decisions

### 2.1 Tenant Strategy

**DECISION:** ✅ **Path-based multi-tenancy** using tenant slug

**Canonical URL Format:**
```
https://torretempo.com/t/{tenantSlug}/
```

**Examples:**
```
https://torretempo.com/t/lakeside-murcia/dashboard
https://torretempo.com/t/acme-restaurante/employees
https://torretempo.com/t/hotel-plaza/schedule
```

**Rationale:**
- ✅ Works immediately on single VPS
- ✅ No wildcard DNS or TLS complexity
- ✅ Simpler QA, support, and automation
- ✅ Easier subdomain migration path later
- ✅ Better SEO for public marketing pages

**Locked Rule:**
- **Tenant slug ≠ CIF/NIE** (tax ID never in URL)
- Slug is **non-sensitive**, **human-friendly**, **immutable after creation**
- CIF/NIE stored securely, never exposed in URLs or public APIs

---

### 2.2 Geolocation Legal Position

**DECISION:** ✅ **Geolocation ENABLED by default, event-only, AEPD-compliant**

**Implementation Rules (Non-Negotiable):**

| Rule | Status |
|------|--------|
| Location captured **only at clock in/out** | ✅ MANDATORY |
| **Never continuous tracking** | ✅ MANDATORY |
| **Never background tracking** | ✅ MANDATORY |
| **Never outside working time** | ✅ MANDATORY |
| **Never mandatory to block clocking** | ✅ MANDATORY |
| If location denied → **allow clock, flag record** | ✅ MANDATORY |

**Legal Basis:**
- ✅ **Legal obligation** (Royal Decree-Law 8/2019 - mandatory time tracking)
- ✅ **Legitimate interest** (verify work location for mobile workers)
- ❌ **NOT consent** (invalid in employment relationship per AEPD)

**Tenant Controls (UI-Configurable):**
- Enable/disable geolocation per tenant
- Require/optional/disabled per employee
- Include/exclude from exports
- Geofencing rules (paid add-on)

**Compliance Documentation:**
- ✅ DPIA (Data Protection Impact Assessment) template provided
- ✅ Works Council consultation guide included
- ✅ Employee transparency notice templates
- ✅ AEPD-defensible implementation

**Evidence:** Based on AEPD guidance (May 2021), Spanish Supreme Court rulings (2020-2021), and 2026 draft regulations.

---

### 2.3 Core vs Add-On Strategy

**DECISION:** ✅ **Modular SaaS architecture from day one**

**Core Principle:**
> **Core must always be legally compliant on its own.  
> Everything else is modular and sellable.**

**Implementation:**
- ✅ Feature flags control module access
- ✅ Module state stored in `tenant_modules` table
- ✅ API enforces module checks
- ✅ UI shows "upgrade" prompts for locked features
- ✅ Billing integration ready (Stripe-compatible)

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│         Public Landing Page (torretempo.com)            │
│     Marketing · Pricing · Features · Tenant Login       │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│        Tenant Routing Layer (/t/{tenantSlug}/)          │
│          Path-based isolation · Slug resolution          │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Multi-Tenant Application Layer              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Auth Service │  │Time Tracking │  │  Scheduling  │  │
│  │  (JWT+MFA)   │  │(Geo, Audit)  │  │(Deputy-like) │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Employee   │  │   Approval   │  │  Reporting   │  │
│  │  Management  │  │   Workflow   │  │  & Export    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Module     │  │      UI      │  │    Config    │  │
│  │   Manager    │  │ Config Engine│  │    Engine    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│          Data Access Layer (Tenant-Scoped)               │
│        All queries automatically filtered by tenant_id   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│            PostgreSQL 15+ Database                       │
│     Shared schema · tenant_id isolation · Row-level      │
│          security · JSONB configuration storage          │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Application Layers

#### Presentation Layer
- **Public Landing:** Marketing, pricing, tenant login
- **Tenant Web App:** React + TypeScript SPA
- **Mobile App:** React Native + Expo (iOS/Android)
- **Admin Console:** Tenant configuration UI

#### Business Logic Layer
- **Auth Service:** JWT, MFA, SSO (SAML, OAuth2)
- **Time Tracking:** Clock in/out, geolocation, validation
- **Scheduling:** Deputy-style drag-and-drop (paid add-on)
- **Approval Workflow:** Correction requests, manager approval
- **Module Manager:** Feature flag enforcement
- **Config Engine:** Metadata-driven UI rendering

#### Data Access Layer
- **Tenant Isolation:** Automatic `tenant_id` filtering
- **Audit Logging:** Append-only, immutable records
- **JSONB Queries:** Flexible configuration storage

#### Infrastructure Layer
- **Database:** PostgreSQL 15+ (single instance, partitioned tables)
- **Cache:** Redis (session, configuration)
- **Storage:** S3-compatible (exports, logos)
- **Queue:** BullMQ (async jobs, notifications)

---

## 4. Multi-Tenancy Architecture

### 4.1 Path-Based Tenant Resolution

**URL Structure:**
```
/t/{tenantSlug}/{resource}
```

**Examples:**
```
GET  /t/acme/api/employees          → Tenant: acme
POST /t/acme/api/timesheet/clock-in → Tenant: acme
GET  /t/lakeside/dashboard           → Tenant: lakeside
```

**Resolution Process:**
1. Extract `tenantSlug` from URL path
2. Lookup tenant in `tenants` table by slug
3. Verify tenant is active (`status = 'active'`)
4. Set `tenant_id` in request context
5. All subsequent queries auto-filtered by `tenant_id`

### 4.2 Tenant Isolation Strategy

**Database Level:**
```sql
-- PostgreSQL Row-Level Security (RLS)
CREATE POLICY tenant_isolation ON employees
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
```

**Application Level:**
```typescript
// Automatic tenant scoping in ORM
class TenantAwareRepository<T> {
  constructor(private tenantId: string) {}
  
  async find(query: QueryOptions): Promise<T[]> {
    return db.query({
      ...query,
      where: {
        ...query.where,
        tenant_id: this.tenantId // Always injected
      }
    });
  }
}
```

**API Level:**
```typescript
// Middleware enforces tenant isolation
app.use('/t/:tenantSlug/*', (req, res, next) => {
  const tenant = await getTenantBySlug(req.params.tenantSlug);
  if (!tenant || tenant.status !== 'active') {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  req.tenant = tenant;
  req.tenantId = tenant.id;
  next();
});
```

### 4.3 Tenant Data Model

```typescript
interface Tenant {
  id: string; // UUID
  slug: string; // Unique, immutable, URL-safe
  legal_name: string;
  tax_id: string; // CIF/NIF (encrypted, never in URLs)
  email: string;
  phone: string;
  address: string;
  
  // Subscription
  status: 'trial' | 'active' | 'suspended' | 'cancelled';
  plan: 'core' | 'pro' | 'advanced' | 'enterprise';
  modules: ModuleStatus[]; // Enabled add-on modules
  
  // Branding
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  
  // Configuration (JSONB)
  settings: TenantSettings;
  
  // Metadata
  created_at: timestamp;
  updated_at: timestamp;
  deleted_at: timestamp; // Soft delete
}

interface TenantSettings {
  workHours: {
    standardHoursPerDay: number;
    standardHoursPerWeek: number;
    overtimeThreshold: 'daily' | 'weekly';
    overtimeRate: number;
  };
  breaks: {
    autoDeduct: boolean;
    breakMinutes: number;
    breakAfterHours: number;
  };
  geolocation: {
    enabled: boolean;
    required: boolean;
    includeInExports: boolean;
  };
  compliance: {
    jurisdiction: 'ES';
    retentionYears: number;
    digitalSignature: boolean;
  };
}
```

---

## 5. Core Product (Always Included)

### 5.1 Core Features (Inspection-Safe Minimum)

**Principle:** ✅ A tenant using **only Core** passes a labor inspection.

#### Multi-Tenant Isolation
- ✅ Complete data isolation per tenant
- ✅ Tenant-scoped authentication
- ✅ Audit trail of all tenant access

#### Tenant Branding (Basic)
- ✅ Logo upload
- ✅ Primary/secondary colors
- ✅ Company legal name display

#### Employee Profiles
- ✅ All legally required fields (see Data Model)
- ✅ National ID (DNI/NIE), social security number
- ✅ Contract type, hire date, work schedule
- ✅ Department assignment
- ✅ CSV import/export

#### Clock In/Out (Web + Mobile)
- ✅ One-tap clock in/out
- ✅ Automatic break deduction (configurable)
- ✅ Overtime detection
- ✅ Duplicate prevention
- ✅ Missing clock-out warnings

#### Event-Only Geolocation
- ✅ Capture location at clock in/out only
- ✅ No continuous tracking
- ✅ No background tracking
- ✅ Employee can see location data
- ✅ Configurable (enable/disable, require/optional)

#### Append-Only Audit Log
- ✅ Every change recorded
- ✅ Immutable original records
- ✅ Correction history preserved
- ✅ Who/when/what/why tracked
- ✅ 4-year minimum retention

#### Employee Self-Access
- ✅ View own time records
- ✅ Download personal data (GDPR right)
- ✅ Monthly summaries
- ✅ Request corrections (workflow = paid add-on)

#### 4-Year Retention
- ✅ Automatic retention enforcement
- ✅ Configurable retention period (4+ years)
- ✅ Soft delete with recovery
- ✅ Hard delete after retention expires

#### Basic Reports
- ✅ Employee time summary (PDF/CSV)
- ✅ Period-based reports (daily/weekly/monthly)
- ✅ Basic export (unsigned, no advanced formatting)

#### Basic Scheduling (View + Simple Assign)
- ✅ Calendar view of shifts
- ✅ Assign employee to shift (no drag-and-drop)
- ✅ View only (no automation, no conflict detection)

#### CSV Import/Export
- ✅ Employee data import
- ✅ Time entries export
- ✅ Template download

#### API Health Endpoints
- ✅ `/api/health` - System status
- ✅ `/api/version` - API version
- ✅ Basic authentication

---

## 6. Add-On Modules (Sellable)

### 6.1 Module System Architecture

**Module State Storage:**
```sql
CREATE TABLE tenant_modules (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  module_key VARCHAR(50) NOT NULL, -- 'advanced_scheduling', 'compliance_pack', etc.
  enabled BOOLEAN DEFAULT true,
  activated_at TIMESTAMP,
  expires_at TIMESTAMP,
  trial_until TIMESTAMP,
  
  UNIQUE(tenant_id, module_key)
);
```

**Module Keys (Canonical):**
- `advanced_scheduling`
- `compliance_pack`
- `approvals_workflow`
- `geo_verification`
- `analytics_insights`
- `api_integrations`
- `white_label`

**API Enforcement:**
```typescript
// Middleware checks module access
function requireModule(moduleKey: string) {
  return async (req, res, next) => {
    const hasAccess = await checkModuleAccess(req.tenantId, moduleKey);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Module not enabled',
        upgrade_url: `/t/${req.tenant.slug}/billing/upgrade?module=${moduleKey}`
      });
    }
    next();
  };
}

// Usage
app.post('/api/schedule/copy-week', 
  requireModule('advanced_scheduling'),
  handleCopyWeek
);
```

---

### 6.2 MODULE 1: Advanced Scheduling (Deputy-Inspired)

**Module Key:** `advanced_scheduling`  
**Target Market:** ⭐⭐⭐⭐⭐ Flagship upsell

#### Features Included

**Drag-and-Drop Shift Management:**
- ✅ Visual week/day grid
- ✅ Drag shifts to different employees
- ✅ Drag shifts to different times
- ✅ Resize shift duration
- ✅ Touch-optimized for mobile

**Copy/Paste Weeks:**
- ✅ Copy entire week template
- ✅ Paste to future weeks
- ✅ Filter by department/location
- ✅ Preserve or clear employee assignments

**Shift Templates & Recurring:**
- ✅ Save shift as template ("Morning Shift", "Closing")
- ✅ Apply template to multiple days
- ✅ Recurring shift patterns (weekly, bi-weekly)

**Conflict Detection (Real-Time):**
- ✅ Overlap detection
- ✅ Availability violation warnings
- ✅ Rest period validation (11-hour minimum)
- ✅ Maximum hours per week/day
- ✅ Skill/role mismatch alerts

**Publish/Unpublish/Lock:**
- ✅ Draft mode (manager-only visibility)
- ✅ Publish schedule → employees notified
- ✅ Lock published schedule → prevent edits
- ✅ Unlock requires reason (audit trail)

**Availability & Eligibility Rules:**
- ✅ Employee availability constraints (per day of week)
- ✅ Time-off requests block scheduling
- ✅ Skill/role requirements per shift
- ✅ Cost center rules

**Shift Swap & Offer Shift:**
- ✅ Employee requests shift swap
- ✅ Manager approves swap
- ✅ Open shifts offered to eligible employees
- ✅ First-come-first-served or manager assigns

**Notifications & Confirmations:**
- ✅ Schedule published notification
- ✅ Shift assigned notification
- ✅ Shift changed notification
- ✅ Confirmation required (optional)

#### Without This Module

- ❌ No drag-and-drop (calendar view only)
- ❌ No copy/paste weeks
- ❌ No automation or templates
- ❌ No conflict detection
- ❌ Manual shift assignment only

#### Technical Implementation

**Data Model (See Section 8):**
- `shifts` table
- `shift_templates` table
- `employee_availability` table
- `shift_conflicts` view

**UI Components:**
- React Big Calendar + @dnd-kit/core
- Visual grid with hour slots
- Conflict indicators
- Drag handles and resize controls

**API Endpoints:**
```
POST   /api/schedule/shifts
PUT    /api/schedule/shifts/:id
DELETE /api/schedule/shifts/:id
POST   /api/schedule/copy-week
POST   /api/schedule/publish
POST   /api/schedule/lock
GET    /api/schedule/conflicts
```

---

### 6.3 MODULE 2: Advanced Compliance Pack

**Module Key:** `compliance_pack`  
**Target Market:** ⭐⭐⭐⭐⭐ Spain-specific killer feature

#### Features Included

**Inspector-Ready PDF Bundles:**
- ✅ Employee identity + employer legal data header
- ✅ Chronological time entries with location
- ✅ Exception summary (missing clock-out, edits, geo issues)
- ✅ Append-only correction history
- ✅ Audit trail of who accessed export

**Digital Signing (P12 Certificates):**
- ✅ PDF signed with tenant's digital certificate
- ✅ Timestamp authority validation
- ✅ Legally defensible for labor inspection

**Export Registry:**
- ✅ Log who exported what and when
- ✅ Export purpose tracking
- ✅ Audit trail for GDPR compliance

**Exceptions Dashboard:**
- ✅ Missing clock-out detection
- ✅ Geolocation failures
- ✅ Edited records
- ✅ Approval pending

**Custom Export Templates:**
- ✅ Configurable PDF layout
- ✅ Include/exclude fields
- ✅ Header/footer customization
- ✅ Multi-language support

#### Without This Module

- ❌ Basic PDF only (no legal headers)
- ❌ Unsigned exports
- ❌ No exception summaries
- ❌ No export registry

---

### 6.4 MODULE 3: Approvals & Corrections Workflow

**Module Key:** `approvals_workflow`  
**Target Market:** ⭐⭐⭐⭐ Essential for compliance-conscious tenants

#### Features Included

**Correction Requests:**
- ✅ Employee requests correction (with reason)
- ✅ Manager approval queue
- ✅ Immutable original records preserved
- ✅ Correction history visible

**Approval Queue:**
- ✅ Manager dashboard of pending approvals
- ✅ Filter by employee, date, type
- ✅ Batch approve/reject
- ✅ SLA reminders (overdue approvals)

**Dispute Resolution:**
- ✅ Employee disputes rejection
- ✅ HR escalation path
- ✅ Notes and attachments
- ✅ Final decision audit trail

**Workflow Configuration:**
- ✅ Approval required for: overtime, corrections, time-off
- ✅ Auto-approve thresholds (e.g., <15min correction)
- ✅ Multi-level approval chains

#### Without This Module

- ❌ Admin-only corrections
- ❌ No employee self-service
- ❌ No approval workflow

---

### 6.5 MODULE 4: Geo Verification & Geofencing

**Module Key:** `geo_verification`  
**Target Market:** ⭐⭐⭐⭐ Mobile workers, multiple locations

#### Features Included

**Geofencing per Work Center:**
- ✅ Define virtual perimeter around each location
- ✅ Radius-based or polygon shapes
- ✅ "Outside zone" warnings at clock-in/out
- ✅ Configurable enforcement (warn vs block)

**Geo Compliance Reports:**
- ✅ % of clock events within geofence
- ✅ Exception list (outside zone)
- ✅ Location verification summary

**Wi-Fi Verification (Optional):**
- ✅ Detect known Wi-Fi networks
- ✅ Supplement GPS with Wi-Fi for accuracy

#### Without This Module

- ✅ Geolocation still captured (Core feature)
- ❌ No enforcement or zones
- ❌ No compliance reports

---

### 6.6 MODULE 5: Analytics & Insights

**Module Key:** `analytics_insights`  
**Target Market:** ⭐⭐⭐ Operational optimization

#### Features Included

**Scheduled vs Actual Hours:**
- ✅ Compare scheduled shifts to actual clock times
- ✅ Variance analysis
- ✅ Labor cost tracking

**Overtime Trends:**
- ✅ Overtime by employee, department, period
- ✅ Prediction of upcoming overtime
- ✅ Cost impact analysis

**Exception Heatmaps:**
- ✅ Visual heatmap of missing clock-outs
- ✅ Late arrivals / early departures
- ✅ Geolocation failures

**Staffing Gaps:**
- ✅ Understaffed shifts
- ✅ Overstaffed shifts
- ✅ Recommendation engine

**Manager Dashboards:**
- ✅ Real-time "who's clocked in now"
- ✅ Upcoming shifts
- ✅ Pending approvals
- ✅ Compliance warnings

---

### 6.7 MODULE 6: API & Integrations

**Module Key:** `api_integrations`  
**Target Market:** ⭐⭐⭐ Payroll/accounting integrations

#### Features Included

**API Tokens:**
- ✅ Generate tenant-scoped API keys
- ✅ Rate limiting per token
- ✅ Revocation and rotation

**Webhooks:**
- ✅ Clock-in/out events
- ✅ Approval events
- ✅ Schedule changes
- ✅ Retry logic with exponential backoff

**Payroll Exports:**
- ✅ A3 Payroll format
- ✅ Sage compatible
- ✅ Custom formats (configurable)

**Documented REST API:**
- ✅ OpenAPI 3.0 specification
- ✅ Postman collection
- ✅ Code examples (JS, Python, PHP)

---

### 6.8 MODULE 7: White-Label & Customisation Studio

**Module Key:** `white_label`  
**Target Market:** ⭐⭐⭐ Enterprise, franchises

#### Features Included

**Full Branding:**
- ✅ Custom domain (CNAME)
- ✅ Logo, favicon, colors
- ✅ Email templates
- ✅ PDF headers/footers

**Custom Employee Fields:**
- ✅ Add/remove fields via UI
- ✅ Validation rules
- ✅ Required/optional toggle
- ✅ Field types: text, number, date, select, file

**Workflow Builder:**
- ✅ Visual workflow editor
- ✅ Approval steps, notifications, conditions
- ✅ No-code configuration

**Report Builder:**
- ✅ Drag-and-drop report designer
- ✅ Custom fields, filters, grouping
- ✅ Save as template

**Template Editor:**
- ✅ Email notification templates
- ✅ PDF export templates
- ✅ WYSIWYG editor

---

## 7. Geolocation & Compliance

### 7.1 Legal Framework

**Applicable Laws:**
- **GDPR (Regulation EU 2016/679)** - Data protection
- **LOPDGDD (Organic Law 3/2018)** - Spanish GDPR implementation
- **Royal Decree-Law 8/2019** - Mandatory digital time tracking
- **Draft Royal Decree 2025/2026** - Enhanced requirements (expected 2026)

**Regulatory Authority:**
- **AEPD (Agencia Española de Protección de Datos)**

### 7.2 Legal vs Illegal Geolocation

#### ✅ LEGAL Use Cases

**Punctual GPS at Clock-In/Out:**
- ✅ Capture location **only at moment of time registration**
- ✅ Verify employee at designated work location
- ✅ Geofencing to confirm presence at worksite
- ✅ Recording location for mobile/itinerant workers

**Legal Basis:**
- ✅ Legal obligation (RDL 8/2019 - mandatory time tracking)
- ✅ Legitimate interest (verify work location)
- ❌ **NOT consent** (invalid in employment relationship)

#### ❌ ILLEGAL Practices

**Continuous Tracking:**
- ❌ Real-time location tracking throughout workday
- ❌ Monitoring movements outside working hours
- ❌ Background location tracking
- ❌ Tracking during breaks or personal time

**Prohibited Actions:**
- ❌ Requiring personal mobile phones for tracking
- ❌ Using location data for performance evaluation (without separate legal basis)
- ❌ Sharing location data beyond necessary personnel
- ❌ Retaining location data beyond 4 years

### 7.3 Compliance Requirements

#### Pre-Implementation (Mandatory)

**DPIA (Data Protection Impact Assessment):**
- ✅ Required before geolocation launch
- ✅ Template provided in compliance documentation
- ✅ Must document necessity, proportionality, risks, mitigation

**Works Council Consultation:**
- ✅ Required if applicable (Article 64.5 Workers' Statute)
- ✅ Failure to consult invalidates system (Telepizza ruling)
- ✅ Template consultation documents provided

**Employee Information:**
- ✅ Clear written policy explaining geolocation
- ✅ What data collected (GPS coordinates, timestamps)
- ✅ When collected (only at clock-in/out)
- ✅ Legal basis (legal obligation, legitimate interest)
- ✅ Retention period (4 years minimum)
- ✅ Employee rights (access, rectification, objection)

#### During Operation (Ongoing)

**Transparency:**
- ✅ Employee sees location data at time of capture
- ✅ Real-time access to own location history
- ✅ Monthly detailed reports include location (if configured)

**Security:**
- ✅ End-to-end encryption
- ✅ Role-based access controls
- ✅ Audit logs of who accessed location data

**Data Minimization:**
- ✅ Only GPS coordinates at clock-in/out
- ✅ No movement patterns
- ✅ No location during breaks
- ✅ No off-hours location

### 7.4 Implementation Specification

**Mobile App Behavior:**
```typescript
interface ClockInRequest {
  employee_id: string;
  timestamp: Date;
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number; // meters
  };
  location_permission_status: 'granted' | 'denied' | 'not_requested';
}

// If location permission denied:
// - Allow clock-in to proceed
// - Flag record as "location_not_available"
// - No blocking of time tracking
```

**Server-Side Storage:**
```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  employee_id UUID NOT NULL,
  
  clock_in_time TIMESTAMP NOT NULL,
  clock_in_location POINT, -- PostGIS POINT type
  clock_in_location_accuracy INTEGER, -- meters
  clock_in_location_status VARCHAR(20), -- 'captured', 'denied', 'unavailable'
  
  clock_out_time TIMESTAMP,
  clock_out_location POINT,
  clock_out_location_accuracy INTEGER,
  clock_out_location_status VARCHAR(20),
  
  -- Never track location between clock-in and clock-out
  -- No continuous tracking columns
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Audit Trail:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL, -- 'view_location_data', 'export_with_location', etc.
  entity_type VARCHAR(100),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Log every access to location data
INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id)
VALUES (:tenant_id, :user_id, 'view_location_data', 'time_entry', :time_entry_id);
```

### 7.5 Compliance Checkpoints (Before Launch)

**Pre-Launch Checklist:**
- [ ] DPIA completed and documented
- [ ] Works Council consulted (if applicable)
- [ ] Legal basis identified and documented
- [ ] Employee information notices prepared
- [ ] Privacy policy updated
- [ ] Technical security measures implemented
- [ ] Less invasive alternatives evaluated

**System Design:**
- [ ] Geolocation limited to clock-in/out only
- [ ] No continuous tracking
- [ ] No tracking outside working hours
- [ ] Data encrypted in transit and at rest
- [ ] Immutable audit trail
- [ ] Automatic deletion after 4 years

**Employee Rights:**
- [ ] Real-time access to own data
- [ ] Monthly detailed reports
- [ ] Clear process for access/rectification requests
- [ ] Response procedures within 1-month deadline

---

## 8. Data Model

### 8.1 Core Tables

#### tenants

**Purpose:** Multi-tenant isolation and configuration

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL, -- URL-safe, immutable
  
  -- Legal entity
  legal_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50), -- CIF/NIF (encrypted)
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  
  -- Subscription
  status VARCHAR(20) DEFAULT 'active', -- 'trial', 'active', 'suspended', 'cancelled'
  plan VARCHAR(20) DEFAULT 'core', -- 'core', 'pro', 'advanced', 'enterprise'
  
  -- Branding
  logo_url VARCHAR(500),
  primary_color VARCHAR(7), -- Hex color
  secondary_color VARCHAR(7),
  
  -- Configuration (JSONB for flexibility)
  settings JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);
CREATE INDEX idx_tenants_deleted ON tenants(deleted_at) WHERE deleted_at IS NULL;
```

#### tenant_modules

**Purpose:** Module access control

```sql
CREATE TABLE tenant_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key VARCHAR(50) NOT NULL, -- 'advanced_scheduling', 'compliance_pack', etc.
  enabled BOOLEAN DEFAULT true,
  activated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  trial_until TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, module_key)
);

CREATE INDEX idx_tenant_modules_tenant ON tenant_modules(tenant_id);
CREATE INDEX idx_tenant_modules_key ON tenant_modules(module_key);
```

#### users

**Purpose:** Platform-wide user accounts

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- Bcrypt
  
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

#### tenant_users

**Purpose:** User-tenant-role mapping

```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  role VARCHAR(50) NOT NULL, -- 'platform_owner', 'tenant_admin', 'manager', 'employee'
  employee_id UUID REFERENCES employees(id),
  
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
```

#### employees

**Purpose:** Employee profiles with all legally required fields

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
  contract_type VARCHAR(50) NOT NULL, -- 'permanent', 'temporary', 'contractor'
  employment_status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'terminated'
  
  -- Contact
  phone VARCHAR(50),
  mobile VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(2) DEFAULT 'ES',
  
  -- Legal/compliance (Spain-specific)
  national_id VARCHAR(50), -- DNI/NIE
  social_security_number VARCHAR(50),
  tax_id VARCHAR(50), -- NIF
  date_of_birth DATE,
  nationality VARCHAR(2),
  
  -- Employment details
  work_schedule VARCHAR(50) DEFAULT 'full-time',
  hours_per_week DECIMAL(5,2) DEFAULT 40.00,
  manager_id UUID REFERENCES employees(id),
  cost_center VARCHAR(50),
  
  -- System
  profile_photo_url VARCHAR(500),
  notes TEXT,
  custom_fields JSONB, -- Tenant-specific custom fields
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  UNIQUE(tenant_id, employee_number),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_status ON employees(tenant_id, employment_status);
CREATE INDEX idx_employees_department ON employees(tenant_id, department_id);
CREATE INDEX idx_employees_deleted ON employees(deleted_at) WHERE deleted_at IS NULL;
```

#### time_entries

**Purpose:** Clock in/out records with event-only geolocation

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
  
  -- Geolocation (event-only, AEPD-compliant)
  clock_in_location POINT, -- PostGIS POINT type (latitude, longitude)
  clock_in_location_accuracy INTEGER, -- meters
  clock_in_location_status VARCHAR(20), -- 'captured', 'denied', 'unavailable'
  
  clock_out_location POINT,
  clock_out_location_accuracy INTEGER,
  clock_out_location_status VARCHAR(20),
  
  -- Optional fields
  project_id UUID REFERENCES projects(id),
  task_description TEXT,
  clock_in_ip VARCHAR(45),
  clock_out_ip VARCHAR(45),
  
  -- Approval workflow (paid add-on)
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
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
  CONSTRAINT valid_total_hours CHECK (total_hours IS NULL OR total_hours >= 0)
);

CREATE INDEX idx_time_entries_tenant ON time_entries(tenant_id);
CREATE INDEX idx_time_entries_employee ON time_entries(tenant_id, employee_id);
CREATE INDEX idx_time_entries_date ON time_entries(tenant_id, clock_in);
CREATE INDEX idx_time_entries_status ON time_entries(tenant_id, status);
CREATE INDEX idx_time_entries_deleted ON time_entries(deleted_at) WHERE deleted_at IS NULL;
```

### 8.2 Scheduling Tables (Advanced Scheduling Module)

#### shifts

**Purpose:** Individual shift records (not templates)

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  employee_id UUID REFERENCES employees(id), -- NULL = unassigned/open shift
  location_id UUID REFERENCES locations(id),
  department_id UUID REFERENCES departments(id),
  
  shift_date DATE NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'published', 'locked'
  
  -- Optional fields
  shift_template_id UUID REFERENCES shift_templates(id),
  required_skill VARCHAR(100),
  notes TEXT,
  color VARCHAR(7), -- Hex color for UI
  
  -- Publishing
  published_at TIMESTAMP,
  published_by UUID REFERENCES users(id),
  locked_at TIMESTAMP,
  locked_by UUID REFERENCES users(id),
  unlock_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  
  CONSTRAINT valid_shift_time CHECK (end_time > start_time)
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_employee ON shifts(tenant_id, employee_id);
CREATE INDEX idx_shifts_date ON shifts(tenant_id, shift_date);
CREATE INDEX idx_shifts_status ON shifts(tenant_id, status);
CREATE INDEX idx_shifts_deleted ON shifts(deleted_at) WHERE deleted_at IS NULL;

-- Prevent double-booking
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE INDEX idx_shifts_overlap ON shifts USING GIST (
  employee_id,
  tsrange(start_time, end_time)
) WHERE deleted_at IS NULL;
```

#### shift_templates

**Purpose:** Reusable shift templates

```sql
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(100) NOT NULL, -- "Morning Shift", "Closing", etc.
  description TEXT,
  
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  
  location_id UUID REFERENCES locations(id),
  department_id UUID REFERENCES departments(id),
  required_skill VARCHAR(100),
  color VARCHAR(7),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_shift_templates_tenant ON shift_templates(tenant_id);
```

#### employee_availability

**Purpose:** Employee availability constraints

```sql
CREATE TABLE employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN DEFAULT TRUE,
  recurring BOOLEAN DEFAULT TRUE,
  
  -- Or specific date range
  start_date DATE,
  end_date DATE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employee_availability_employee ON employee_availability(tenant_id, employee_id);
```

### 8.3 Audit & Compliance Tables

#### audit_logs

**Purpose:** Immutable append-only audit trail

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', 'export', 'approve', 'reject'
  entity_type VARCHAR(100), -- 'employee', 'time_entry', 'shift', 'tenant', 'user'
  entity_id UUID,
  
  changes JSONB, -- Before/after values
  
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

**Changes JSONB Structure:**
```json
{
  "before": {
    "clock_out": "2026-02-01T17:30:00Z",
    "total_hours": 8.5
  },
  "after": {
    "clock_out": "2026-02-01T18:00:00Z",
    "total_hours": 9.0
  },
  "reason": "Employee forgot to clock out on time",
  "approved_by": "uuid-of-manager"
}
```

---

## 9. UI Configuration System

### 9.1 Metadata-Driven Architecture

**Principle:** Store UI configuration as data, not code.

**Benefits:**
- ✅ No code changes for tenant customization
- ✅ Instant UI updates without deployment
- ✅ A/B testing configurations
- ✅ Rollback to previous configurations

### 9.2 Configuration Storage

#### tenant_config

**Purpose:** Flexible tenant configuration storage

```sql
CREATE TABLE tenant_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  config_type VARCHAR(50) NOT NULL, -- 'branding', 'features', 'workflows', 'validation'
  config_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(tenant_id, config_type, version)
);

CREATE INDEX idx_tenant_config_tenant_type ON tenant_config(tenant_id, config_type);
CREATE INDEX idx_tenant_config_data_gin ON tenant_config USING GIN(config_data);
```

### 9.3 Dynamic Form Builder

**Form Schema Pattern:**

```typescript
interface FormSchema {
  formId: string;
  entityType: string; // 'employee', 'timesheet', 'shift'
  fields: FormField[];
  layout: LayoutConfig;
  validation: ValidationConfig;
  conditional: ConditionalLogic[];
}

interface FormField {
  id: string;
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  defaultValue?: any;
  placeholder?: string;
  helpText?: string;
  validationRules: ValidationRule[];
  conditional?: ConditionalRule;
  options?: SelectOption[]; // For select/radio/checkbox
  customProperties?: Record<string, any>;
}

type FieldType = 
  | 'text' 
  | 'email' 
  | 'number' 
  | 'date' 
  | 'select' 
  | 'multiselect'
  | 'checkbox' 
  | 'radio' 
  | 'textarea' 
  | 'file';

interface ValidationRule {
  type: ValidationType;
  message: string;
  params?: Record<string, any>;
  validator?: string; // Function name for custom validation
}

type ValidationType = 
  | 'required'
  | 'email'
  | 'url'
  | 'min'
  | 'max'
  | 'minLength'
  | 'maxLength'
  | 'pattern'
  | 'custom'
  | 'unique';
```

**Example: Custom Employee Fields**

```json
{
  "formId": "employee-profile-extended",
  "entityType": "employee",
  "fields": [
    {
      "id": "uniform_size",
      "name": "uniform_size",
      "label": "Uniform Size",
      "type": "select",
      "required": false,
      "options": [
        { "value": "XS", "label": "Extra Small" },
        { "value": "S", "label": "Small" },
        { "value": "M", "label": "Medium" },
        { "value": "L", "label": "Large" },
        { "value": "XL", "label": "Extra Large" }
      ],
      "validationRules": []
    },
    {
      "id": "emergency_contact_name",
      "name": "emergency_contact_name",
      "label": "Emergency Contact Name",
      "type": "text",
      "required": true,
      "validationRules": [
        {
          "type": "required",
          "message": "Emergency contact is required"
        },
        {
          "type": "minLength",
          "params": { "min": 2 },
          "message": "Name must be at least 2 characters"
        }
      ]
    },
    {
      "id": "emergency_contact_phone",
      "name": "emergency_contact_phone",
      "label": "Emergency Contact Phone",
      "type": "text",
      "required": true,
      "validationRules": [
        {
          "type": "pattern",
          "params": { "pattern": "^\\+?[0-9\\s-]+$" },
          "message": "Invalid phone number format"
        }
      ]
    }
  ]
}
```

**Storage in Database:**

```sql
-- Store custom field definitions
INSERT INTO tenant_config (tenant_id, config_type, config_data)
VALUES (
  'tenant-uuid',
  'custom_fields',
  '{
    "entity": "employee",
    "fields": [...]
  }'::jsonb
);

-- Store custom field values
UPDATE employees
SET custom_fields = jsonb_set(
  custom_fields,
  '{uniform_size}',
  '"M"'
)
WHERE id = 'employee-uuid';
```

### 9.4 Business Rules Engine

**Rule Definition:**

```typescript
interface BusinessRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  enabled: boolean;
  priority: number; // Execution order
  
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: RuleAction[];
}

interface RuleTrigger {
  type: 'event' | 'schedule';
  entityType: string;
  events: string[]; // 'create', 'update', 'delete'
  schedule?: string; // Cron expression
}

interface RuleCondition {
  type: 'field_comparison' | 'formula' | 'custom';
  field: string;
  operator: ComparisonOperator;
  value: any;
  valueType: 'static' | 'dynamic' | 'formula';
}

type ComparisonOperator = 
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'in'
  | 'is_empty';

interface RuleAction {
  type: 'set_field' | 'send_notification' | 'trigger_workflow' | 'call_webhook';
  config: Record<string, any>;
}
```

**Example: Overtime Detection Rule**

```json
{
  "id": "overtime-detection",
  "tenantId": "tenant-uuid",
  "name": "Detect Overtime and Trigger Approval",
  "enabled": true,
  "priority": 1,
  
  "trigger": {
    "type": "event",
    "entityType": "time_entry",
    "events": ["create", "update"]
  },
  
  "conditions": [
    {
      "type": "field_comparison",
      "field": "total_hours",
      "operator": "greater_than",
      "value": "{{tenant_settings.workHours.standardHoursPerDay}}",
      "valueType": "dynamic"
    }
  ],
  "conditionLogic": "AND",
  
  "actions": [
    {
      "type": "set_field",
      "config": {
        "field": "status",
        "value": "pending_approval"
      }
    },
    {
      "type": "send_notification",
      "config": {
        "recipients": ["manager"],
        "template": "overtime-approval-request",
        "data": {
          "employee_name": "{{employee.first_name}} {{employee.last_name}}",
          "total_hours": "{{total_hours}}",
          "overtime_hours": "{{overtime_hours}}"
        }
      }
    }
  ]
}
```

### 9.5 Workflow Builder

**Workflow Configuration:**

```typescript
interface WorkflowConfig {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  enabled: boolean;
  
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  
  retries?: RetryConfig;
  onError?: ErrorHandler;
}

interface WorkflowStep {
  id: string;
  type: StepType;
  name: string;
  config: Record<string, any>;
  nextSteps: ConditionalNext[];
  timeout?: number;
}

type StepType = 
  | 'approval'
  | 'notification'
  | 'data_transformation'
  | 'api_call'
  | 'condition'
  | 'loop'
  | 'parallel';

interface ConditionalNext {
  condition?: string; // Formula or expression
  nextStepId: string;
}
```

**Example: Correction Approval Workflow**

```json
{
  "id": "correction-approval-workflow",
  "tenantId": "tenant-uuid",
  "name": "Time Entry Correction Approval",
  "enabled": true,
  
  "trigger": {
    "type": "event",
    "entityType": "correction_request",
    "events": ["create"]
  },
  
  "steps": [
    {
      "id": "check-threshold",
      "type": "condition",
      "name": "Check if Auto-Approve Eligible",
      "config": {
        "condition": "correction_minutes < 15 && employee.trust_level === 'high'"
      },
      "nextSteps": [
        { "condition": "true", "nextStepId": "auto-approve" },
        { "condition": "false", "nextStepId": "notify-manager" }
      ]
    },
    {
      "id": "auto-approve",
      "type": "data_transformation",
      "name": "Auto-Approve Correction",
      "config": {
        "updates": {
          "status": "approved",
          "approved_by": "system",
          "approved_at": "{{now}}"
        }
      },
      "nextSteps": [
        { "nextStepId": "notify-employee-approved" }
      ]
    },
    {
      "id": "notify-manager",
      "type": "approval",
      "name": "Manager Approval Required",
      "config": {
        "approverRole": "manager",
        "notificationTemplate": "correction-approval-request",
        "timeout": 86400000
      },
      "nextSteps": [
        { "condition": "approved", "nextStepId": "apply-correction" },
        { "condition": "rejected", "nextStepId": "notify-employee-rejected" }
      ]
    },
    {
      "id": "apply-correction",
      "type": "data_transformation",
      "name": "Apply Approved Correction",
      "config": {
        "entity": "time_entry",
        "updates": "{{correction_request.changes}}",
        "auditLog": true
      },
      "nextSteps": [
        { "nextStepId": "notify-employee-approved" }
      ]
    },
    {
      "id": "notify-employee-approved",
      "type": "notification",
      "name": "Notify Employee: Approved",
      "config": {
        "recipients": ["{{employee_id}}"],
        "template": "correction-approved",
        "channels": ["email", "in_app"]
      },
      "nextSteps": []
    },
    {
      "id": "notify-employee-rejected",
      "type": "notification",
      "name": "Notify Employee: Rejected",
      "config": {
        "recipients": ["{{employee_id}}"],
        "template": "correction-rejected",
        "data": {
          "rejection_reason": "{{rejection_reason}}"
        },
        "channels": ["email", "in_app"]
      },
      "nextSteps": []
    }
  ]
}
```

---

## 10. Security & Authorization

### 10.1 Authentication

**JWT-Based Authentication:**
```typescript
interface JWTPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  iat: number; // Issued at
  exp: number; // Expiry
}

// Token expiry
accessToken: 15 minutes
refreshToken: 30 days
```

**Multi-Factor Authentication (Optional):**
- ✅ TOTP (Time-based One-Time Password)
- ✅ SMS (via Twilio or similar)
- ✅ Email verification code

**SSO Support (Enterprise):**
- ✅ SAML 2.0
- ✅ OAuth2 / OpenID Connect
- ✅ Azure AD, Google Workspace

### 10.2 Authorization Model

**Role-Based Access Control (RBAC):**

| Role | Permissions |
|------|-------------|
| **platform_owner** | Full platform access, all tenants |
| **tenant_admin** | Full tenant access, all features |
| **manager** | View employees, approve corrections, manage schedules |
| **employee** | View own records, request corrections, view own schedule |

**Permission Matrix:**

| Resource | platform_owner | tenant_admin | manager | employee |
|----------|----------------|--------------|---------|----------|
| View all tenants | ✅ | ❌ | ❌ | ❌ |
| Manage tenant settings | ✅ | ✅ | ❌ | ❌ |
| Add/edit employees | ✅ | ✅ | ✅ | ❌ |
| View all time entries | ✅ | ✅ | ✅ (team only) | ❌ |
| View own time entries | ✅ | ✅ | ✅ | ✅ |
| Edit time entries | ✅ | ✅ | ✅ (corrections) | ❌ |
| Request corrections | ✅ | ✅ | ✅ | ✅ |
| Approve corrections | ✅ | ✅ | ✅ | ❌ |
| Manage schedules | ✅ | ✅ | ✅ | ❌ |
| View own schedule | ✅ | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ✅ (team only) | ✅ (own only) |

### 10.3 Data Protection

**Encryption:**
- ✅ TLS 1.3 in transit
- ✅ AES-256 at rest (sensitive fields)
- ✅ Encrypted database backups

**Sensitive Field Encryption:**
```typescript
// Fields requiring encryption
- tax_id (CIF/NIF)
- national_id (DNI/NIE)
- social_security_number
- password_hash (bcrypt)
- mfa_secret
```

**GDPR Compliance:**
- ✅ Right to access (employee data export)
- ✅ Right to rectification (correction workflow)
- ✅ Right to erasure (soft delete + 4-year retention)
- ✅ Right to data portability (JSON/CSV export)
- ✅ Right to object (geolocation opt-out with flag)

---

## 11. API Architecture

### 11.1 RESTful API Design

**Base URL:**
```
https://torretempo.com/t/{tenantSlug}/api
```

**Authentication:**
```
Authorization: Bearer {jwt_token}
```

**Versioning:**
```
/api/v1/employees
/api/v1/timesheet/clock-in
```

### 11.2 Core API Endpoints

#### Authentication

```
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
POST   /api/v1/auth/mfa/enable
POST   /api/v1/auth/mfa/verify
```

#### Employees

```
GET    /api/v1/employees
POST   /api/v1/employees
GET    /api/v1/employees/:id
PUT    /api/v1/employees/:id
DELETE /api/v1/employees/:id
POST   /api/v1/employees/import
GET    /api/v1/employees/export
```

#### Time Tracking

```
POST   /api/v1/timesheet/clock-in
POST   /api/v1/timesheet/clock-out
GET    /api/v1/timesheet/entries
GET    /api/v1/timesheet/entries/:id
PUT    /api/v1/timesheet/entries/:id (corrections only)
GET    /api/v1/timesheet/current (active clock-in)
```

#### Scheduling (Advanced Scheduling Module)

```
GET    /api/v1/schedule/shifts
POST   /api/v1/schedule/shifts
PUT    /api/v1/schedule/shifts/:id
DELETE /api/v1/schedule/shifts/:id
POST   /api/v1/schedule/copy-week
POST   /api/v1/schedule/publish
POST   /api/v1/schedule/lock
GET    /api/v1/schedule/conflicts
```

#### Approvals (Approvals Workflow Module)

```
GET    /api/v1/approvals/pending
POST   /api/v1/approvals/:id/approve
POST   /api/v1/approvals/:id/reject
GET    /api/v1/approvals/history
```

#### Reports

```
GET    /api/v1/reports/employee-summary
GET    /api/v1/reports/period-summary
POST   /api/v1/reports/export (PDF/CSV)
GET    /api/v1/reports/compliance-bundle (Compliance Pack Module)
```

### 11.3 Module-Gated Endpoints

**Middleware Example:**

```typescript
// Require module for endpoint access
app.post('/api/v1/schedule/copy-week', 
  authenticate,
  requireModule('advanced_scheduling'),
  handleCopyWeek
);

// Module check middleware
function requireModule(moduleKey: string) {
  return async (req, res, next) => {
    const hasAccess = await db.tenantModules.findOne({
      tenant_id: req.tenantId,
      module_key: moduleKey,
      enabled: true
    });
    
    if (!hasAccess) {
      return res.status(403).json({
        error: `Module '${moduleKey}' not enabled`,
        upgrade_url: `/t/${req.tenant.slug}/billing/upgrade?module=${moduleKey}`
      });
    }
    
    next();
  };
}
```

---

## 12. Deployment Architecture

### 12.1 Infrastructure

**Hosting:**
- ✅ EU-based VPS (GDPR compliance)
- ✅ Minimum 4GB RAM, 2 vCPU
- ✅ Ubuntu 22.04 LTS

**Services:**
```
┌─────────────────────────────────────────┐
│         Nginx (Reverse Proxy)           │
│  - TLS termination                      │
│  - Static file serving                  │
│  - Rate limiting                        │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│      Node.js Application (PM2)          │
│  - Express.js API                       │
│  - Multi-tenant routing                 │
│  - Module enforcement                   │
└────────────┬────────────────────────────┘
             │
      ┌──────┴───────┐
      │              │
      ▼              ▼
┌──────────┐  ┌──────────────┐
│PostgreSQL│  │  Redis Cache │
│ 15+      │  │  (sessions)  │
└──────────┘  └──────────────┘
```

### 12.2 Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name torretempo.com;
    
    ssl_certificate /etc/letsencrypt/live/torretempo.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/torretempo.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";
    
    # Static files
    location /static/ {
        root /var/www/torretempo;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy
    location /t/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 12.3 Environment Variables

```bash
# Application
NODE_ENV=production
PORT=3000
BASE_URL=https://torretempo.com

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/torretempo
REDIS_URL=redis://localhost:6379

# Security
JWT_SECRET=<random-256-bit-key>
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d
BCRYPT_ROUNDS=12

# Encryption (for sensitive fields)
ENCRYPTION_KEY=<random-256-bit-key>

# Email (SendGrid/SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>

# Storage (S3-compatible)
S3_ENDPOINT=https://s3.eu-central-1.amazonaws.com
S3_BUCKET=torretempo-files
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>

# Module keys (optional - for testing)
MODULES_ENABLED=advanced_scheduling,compliance_pack
```

---

## 13. Technology Stack

### 13.1 Backend

**Runtime:**
- ✅ Node.js 20 LTS
- ✅ TypeScript 5.x

**Framework:**
- ✅ Express.js 4.x
- ✅ Helmet (security headers)
- ✅ CORS
- ✅ Express Rate Limit

**ORM:**
- ✅ Prisma or TypeORM
- ✅ PostgreSQL 15+
- ✅ Redis for caching

**Authentication:**
- ✅ jsonwebtoken
- ✅ bcrypt
- ✅ speakeasy (TOTP for MFA)

**Validation:**
- ✅ Zod or Joi
- ✅ Express Validator

**Logging:**
- ✅ Winston or Pino
- ✅ Morgan (HTTP logging)

**Queue:**
- ✅ BullMQ (async jobs)
- ✅ Redis as backend

**Testing:**
- ✅ Jest
- ✅ Supertest (API testing)

### 13.2 Frontend

**Framework:**
- ✅ React 18+
- ✅ TypeScript 5.x
- ✅ Vite (build tool)

**UI Library:**
- ✅ Material-UI (MUI) or Ant Design
- ✅ TailwindCSS for custom styling

**State Management:**
- ✅ Zustand or Redux Toolkit
- ✅ React Query (server state)

**Forms:**
- ✅ React Hook Form
- ✅ Zod for validation

**Routing:**
- ✅ React Router v6

**Scheduling UI:**
- ✅ React Big Calendar
- ✅ @dnd-kit/core (drag-and-drop)

**Date/Time:**
- ✅ date-fns or Day.js

**Testing:**
- ✅ Vitest
- ✅ React Testing Library

### 13.3 Mobile

**Framework:**
- ✅ React Native
- ✅ Expo (managed workflow)

**UI Components:**
- ✅ React Native Paper or NativeBase

**Navigation:**
- ✅ React Navigation

**Offline Support:**
- ✅ WatermelonDB or PouchDB
- ✅ Background sync

**Geolocation:**
- ✅ expo-location
- ✅ Event-only, no background tracking

**Testing:**
- ✅ Jest
- ✅ Detox (E2E)

### 13.4 Database

**Primary:**
- ✅ PostgreSQL 15+
- ✅ UUID extension
- ✅ PostGIS (for geolocation)
- ✅ JSONB for flexible configuration

**Caching:**
- ✅ Redis 7+
- ✅ Session storage
- ✅ Tenant configuration cache

**Backup:**
- ✅ Automated daily backups
- ✅ Point-in-time recovery (PITR)
- ✅ 4-year minimum retention

### 13.5 DevOps

**CI/CD:**
- ✅ GitHub Actions
- ✅ Automated testing
- ✅ Linting (ESLint, Prettier)

**Monitoring:**
- ✅ PM2 (process management)
- ✅ Sentry (error tracking)
- ✅ Grafana + Prometheus (metrics)

**Security:**
- ✅ Dependabot (dependency updates)
- ✅ OWASP ZAP (security scanning)
- ✅ Let's Encrypt (TLS certificates)

---

## Document Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-02-01 | Product Team | ✅ LOCKED - Authoritative specification with final decisions |
| 1.0 | 2026-02-01 | Initial Team | Initial draft (superseded) |

---

## Appendix A: Module Pricing Strategy (Indicative)

| Plan | Monthly Price | Modules Included |
|------|---------------|------------------|
| **Core** | €19/month | Core features only |
| **Pro** | €49/month | Core + Advanced Scheduling + Approvals |
| **Advanced** | €99/month | Core + Pro + Compliance Pack + Geo Verification + Analytics |
| **Enterprise** | Custom | All modules + API + White-Label + Priority support |

**Per-employee pricing tiers available.*

---

## Appendix B: Compliance Checklist

**Before Launch:**
- [ ] DPIA completed and reviewed
- [ ] Works Council consulted (if applicable)
- [ ] Employee information notices prepared
- [ ] Privacy policy published
- [ ] GDPR/LOPDGDD compliance verified
- [ ] 4-year data retention configured
- [ ] Geolocation event-only confirmed
- [ ] Append-only audit trail tested
- [ ] Signed export capability tested (if using Compliance Pack)
- [ ] Labor inspection readiness verified

---

**END OF SPECIFICATION**

**Status:** ✅ **LOCKED**  
**This document is the authoritative source of truth for Torre Tempo.**  
**All implementation must conform to this specification unless explicitly overridden.**