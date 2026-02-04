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
✅ **Payment Processing** - Stripe (cards) + GoCardless (SEPA direct debit)  
✅ **Billing Portal** - MRR/ARR metrics, subscription management, invoice tracking  
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
- **Payments:** Stripe + GoCardless APIs

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
                    │
        ┌───────────┴────────────┐
        │                        │
┌───────▼────────┐    ┌──────────▼────────┐
│  Stripe API    │    │  GoCardless API   │
│  (Credit Cards)│    │  (SEPA Debit)     │
└────────────────┘    └───────────────────┘
```

---

## 💳 Payment Infrastructure

### Supported Payment Methods

Torre Tempo supports **dual payment providers** for maximum flexibility:

#### 🌍 **Stripe** (Primary - Credit/Debit Cards)
- **Use Case:** International customers, card payments
- **Currencies:** EUR, USD, GBP (multi-currency support)
- **Features:**
  - Instant payment confirmation
  - 3D Secure (SCA compliant)
  - Subscription billing with automatic retry
  - Webhook-driven payment updates
  - Customer portal for card management

#### 🇪🇺 **GoCardless** (EU - SEPA Direct Debit)
- **Use Case:** European customers, bank transfers
- **Coverage:** 34 European countries (SEPA zone)
- **Features:**
  - Lower transaction fees (0.3% vs 2.9% cards)
  - Automatic mandate creation
  - Direct debit collection
  - Payment status webhooks
  - Perfect for recurring subscriptions

### Database Schema

```sql
-- Tenant payment provider links
ALTER TABLE tenants ADD COLUMN stripe_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN stripe_subscription_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN gocardless_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN gocardless_mandate_id VARCHAR(255);

-- Payment transactions
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  amount INTEGER NOT NULL,               -- Cents
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(50),                    -- pending, succeeded, failed
  payment_method VARCHAR(50),            -- stripe, gocardless
  stripe_payment_intent_id VARCHAR(255),
  gocardless_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  invoice_number VARCHAR(255) UNIQUE,
  amount INTEGER NOT NULL,
  status VARCHAR(50),                    -- draft, open, paid, void
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

**Platform Admin Billing Routes:**

```
# Subscription Management
GET    /api/v1/platform/billing/subscriptions   # List all subscriptions
GET    /api/v1/platform/billing/revenue         # Calculate MRR/ARR
PUT    /api/v1/platform/billing/subscriptions/:id  # Update subscription

# Stripe Integration
POST   /api/v1/platform/stripe/customers        # Create Stripe customer
POST   /api/v1/platform/stripe/subscriptions    # Create subscription
DELETE /api/v1/platform/stripe/subscriptions/:id   # Cancel subscription
POST   /api/v1/platform/stripe/webhook          # Handle Stripe webhooks
GET    /api/v1/platform/stripe/prices           # List pricing tiers

# GoCardless Integration
POST   /api/v1/platform/gocardless/customers    # Create customer
POST   /api/v1/platform/gocardless/mandates     # Create SEPA mandate
POST   /api/v1/platform/gocardless/payments     # Charge via direct debit
DELETE /api/v1/platform/gocardless/mandates/:id  # Cancel mandate
POST   /api/v1/platform/gocardless/webhook      # Handle GC webhooks
```

### Environment Variables

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# GoCardless Configuration
GOCARDLESS_ACCESS_TOKEN=your_gocardless_token
GOCARDLESS_ENVIRONMENT=sandbox  # or 'live'
GOCARDLESS_WEBHOOK_SECRET=your_webhook_secret
```

### Webhook Configuration

**Stripe Webhooks:**
```
URL: https://time.lsltgroup.es/api/v1/platform/stripe/webhook
Events:
  - customer.subscription.created
  - customer.subscription.updated
  - customer.subscription.deleted
  - invoice.payment_succeeded
  - invoice.payment_failed
```

**GoCardless Webhooks:**
```
URL: https://time.lsltgroup.es/api/v1/platform/gocardless/webhook
Events:
  - payments (all statuses)
  - mandates (all statuses)
```

---

## 👥 Demo Accounts

**Tenant Slug:** `demo` (use for all logins)

| Email                     | Password      | Role               | Access Level                                 |
| ------------------------- | ------------- | ------------------ | -------------------------------------------- |
| `platform@torretempo.com` | `platform123` | **PLATFORM_ADMIN** | God mode - all tenants, platform settings   
