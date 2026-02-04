# React Router Multi-Tenant Path-Based Routing Research
Date: 2026-02-04
Purpose: Best practices for implementing /t/:tenantSlug/* routing in Torre Tempo

## 1. ROUTE STRUCTURE WITH TENANT PARAMETER
Pattern: Nested Routes with Dynamic Tenant Segment
Evidence: Logto Console, React Router v6 docs

Key structure:
- Use pathless routes for wrappers (no path prop)
- Nested Outlets for layered protection
- Layout route extracts tenant from URL

## 2. TENANT CONTEXT PROVIDER
Pattern: Extract tenant from URL using useParams, provide via Context
Evidence: Logto TenantsProvider, SaaS Boilerplate CurrentTenantProvider

Key implementation:
- useParams in layout component to extract tenantSlug
- Fetch tenant data on slug change
- Provide currentTenant via Context
- Handle loading and error states

## 3. PROTECTED ROUTE WRAPPER
Pattern: Layered route protection (Auth then Tenant)
Evidence: Logto ProtectedRoutes and TenantAccess

Two layers:
1. ProtectedRoutes - checks authentication
2. TenantAccess - validates tenant access

## 4. API CLIENT WITH TENANT CONTEXT
Pattern: Axios interceptor with tenant header
Evidence: Continew Admin UI, Vault Provider

Implementation:
- Request interceptor adds X-Tenant-Slug header
- Extract tenant from URL pathname
- Alternative: Hook-based API client with useTenant

## 5. NAVIGATION HELPERS
Pattern: Preserve tenant slug in navigation
Custom hooks and components:
- useTenantNavigate() - auto-prefix with /t/:tenantSlug
- TenantLink component - wrapper for Link

## 6. BEST PRACTICES
DO:
- Use nested routes with Outlet
- Validate tenant access separately from auth
- Use interceptors for automatic tenant headers
- Handle loading states
- Cache tenant data in context

DONT:
- Expose tenant ID in URLs (use slug)
- Skip tenant validation
- Hardcode tenant in API calls
- Store tenant in localStorage (URL is source of truth)

## 7. IMPLEMENTATION CHECKLIST
Phase 1: Core Infrastructure
- TenantContext.tsx with provider and hook
- TenantLayout.tsx wrapper component
- Update App.tsx routes to /t/:tenantSlug pattern
- ProtectedRoutes.tsx for auth layer
- TenantAccess.tsx for tenant validation

Phase 2: API Integration
- Update api.ts with tenant interceptor
- Create useApi() hook
- Backend endpoint: GET /api/tenants/by-slug/:slug

Phase 3: Navigation Helpers
- useTenantNavigate() hook
- TenantLink component

Phase 4: Error Handling
- 403/404 error pages
- Redirect to tenant selection
- Loading states

## 8. REFERENCES
- React Router v6 Nested Routes docs
- Logto Console (real-world multi-tenant SaaS)
- SaaS Boilerplate (Apptension)
- Continew Admin UI (tenant header pattern)
