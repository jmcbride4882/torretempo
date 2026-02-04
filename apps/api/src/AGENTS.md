# API BACKEND - apps/api/src

Express REST API. 33 files, 8.4k LOC. Multi-tenant path-based routing.

---

## STRUCTURE

```
apps/api/src/
├── index.ts              # Express app + middleware chain + route registration
├── middleware/           # Auth, tenant context, RBAC, error handling
├── routes/               # REST endpoints (platform-*.routes.ts = god-mode)
├── services/             # Business logic + Prisma queries (NO repository layer)
├── locales/              # Backend i18n
├── templates/            # Email HTML (Handlebars)
└── utils/                # Logger, helpers

⚠️ MISSING: repositories/, validators/, types/ (violates parent AGENTS.md)
```

---

## WHERE TO LOOK

| Task                     | Location                       | Notes                                 |
| ------------------------ | ------------------------------ | ------------------------------------- |
| Multi-tenant routing     | `index.ts` L70-113             | `/api/v1/t/:tenantSlug/*`             |
| Platform admin routes    | `index.ts` L45-68              | `/api/v1/platform/*` (cross-tenant)   |
| Tenant context injection | `middleware/tenant-context.ts` | Extracts slug, validates, injects req |
| RBAC enforcement         | `middleware/authorize.ts`      | `isAdminOrManager`                    |
| Validation               | Inline in routes (Zod)         | NOT in validators/ directory          |
| Data access              | `services/*.service.ts`        | Prisma queries directly               |
| Email sending            | `services/email.service.ts`    | Tenant-specific SMTP + Handlebars     |

---

## CONVENTIONS (Deviations from Parent)

**File Naming:** Mix of kebab-case (`employee.routes.ts`) and camelCase (`timeEntry.routes.ts`) - VIOLATION

**Architecture:**

- NO repository layer - services handle business logic + Prisma queries
- NO validators/ - Zod schemas inline in routes
- NO types/ - interfaces inline in services/routes
- Tenant context: `(req as any).tenantId` (no typed Express.Request extension)

**Multi-Tenant Routing:**

```typescript
// Platform (god-mode, no tenant context)
app.use("/api/v1/platform/tenants", authenticate, platformAdmin, routes);

// Tenant (path-based isolation)
app.use("/api/v1/t/:tenantSlug/employees", authenticate, tenantContext, routes);
```

**Middleware order:** authenticate → tenantContext → route handler

---

## ANTI-PATTERNS

❌ Skip tenant filter in Prisma queries  
❌ Use platform routes for tenant operations  
❌ Wrong middleware order (tenantContext before authenticate)  
❌ Mix route naming (stick to kebab-case)  
❌ Business logic in routes (delegate to services)  
❌ Manual slug extraction (use tenantContext middleware)

**Service Layer:**

```typescript
// ✅ GOOD
async getAll(tenantId: string) {
  return prisma.employee.findMany({ where: { tenantId, deletedAt: null } });
}

// ❌ BAD - Missing tenant filter
async getAll() {
  return prisma.employee.findMany({ where: { deletedAt: null } });
}
```
