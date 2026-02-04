# Tenant Slug Routing Implementation Plan

**Goal:** Implement path-based multi-tenancy with `/t/:tenantSlug/*` URL structure per spec.md

**Status:** Ready to implement  
**Complexity:** High (architectural change)  
**Estimated Effort:** 6-8 tasks

---

## Context

**Current State:**

- URLs: `/dashboard`, `/employees`, etc. (no tenant context)
- Login: tenantSlug as form input field
- Backend: tenant-context middleware EXISTS but NOT mounted
- Auth: tenant context from JWT token only

**Target State:**

- URLs: `/t/demo/dashboard`, `/t/lakeside/employees`, etc.
- Login: `/t/:tenantSlug/login` (slug from URL)
- Backend: tenant-context middleware MOUNTED and active
- Auth: tenant context from URL path + JWT validation

---

## Implementation Tasks

### Phase 1: Backend Foundation (2 tasks)

- [ ] **Task 1.1:** Mount tenant-context middleware in Express app
  - File: `apps/api/src/index.ts`
  - Add middleware BEFORE route handlers
  - Update route paths to expect `/t/:tenantSlug` prefix
  - Test: Verify middleware extracts tenant from URL
  - Parallelizable: No

- [ ] **Task 1.2:** Update auth routes to extract tenantSlug from URL
  - File: `apps/api/src/routes/auth.routes.ts`
  - Remove tenantSlug from login request body schema
  - Extract from `req.tenant.slug` (injected by middleware)
  - File: `apps/api/src/services/auth.service.ts`
  - Update login() to accept tenantSlug from middleware
  - Test: Login with `/t/demo/api/v1/auth/login`
  - Parallelizable: No (depends on 1.1)

### Phase 2: Frontend Core Infrastructure (3 tasks)

- [ ] **Task 2.1:** Create TenantContext and TenantLayout components
  - Files:
    - `apps/web/src/contexts/TenantContext.tsx` (new)
    - `apps/web/src/components/TenantLayout.tsx` (new)
  - TenantContext: Extract slug from URL, fetch tenant data, provide via context
  - TenantLayout: Wrapper that provides tenant context to children
  - Export: `useTenant()` hook for accessing tenant context
  - Test: Console log tenant data when navigating to `/t/demo`
  - Parallelizable: Yes (can work while backend is being updated)

- [ ] **Task 2.2:** Update App.tsx routing structure
  - File: `apps/web/src/App.tsx`
  - Wrap all protected routes under `/t/:tenantSlug` prefix
  - Structure: `/t/:tenantSlug` → TenantLayout → ProtectedRoute → Pages
  - Update all route paths: `/dashboard` → `/t/:tenantSlug/dashboard`
  - Test: Navigate to `/t/demo/dashboard` and verify page loads
  - Parallelizable: No (depends on 2.1)

- [ ] **Task 2.3:** Update LoginPage to extract tenant from URL
  - File: `apps/web/src/pages/LoginPage.tsx`
  - Remove tenantSlug form input field
  - Extract tenantSlug from URL using `useParams()`
  - Update route: `/login` → `/t/:tenantSlug/login`
  - Redirect after login: `/t/${tenantSlug}/dashboard`
  - Test: Login at `/t/demo/login` and verify redirect
  - Parallelizable: No (depends on 2.2)

### Phase 3: API Integration (1 task)

- [ ] **Task 3.1:** Update API client with tenant interceptor
  - File: `apps/web/src/services/api.ts`
  - Add Axios request interceptor
  - Extract tenantSlug from URL pathname
  - Inject `X-Tenant-Slug` header in all requests
  - Update baseURL logic if needed
  - Test: Verify API calls include tenant header
  - Parallelizable: Yes (can work in parallel with Phase 2)

### Phase 4: Navigation Helpers (2 tasks)

- [ ] **Task 4.1:** Create useTenantNavigate hook
  - File: `apps/web/src/hooks/useTenantNavigate.ts` (new)
  - Wrapper around `useNavigate()` that auto-prefixes with `/t/:tenantSlug`
  - Usage: `tenantNavigate('/dashboard')` → navigates to `/t/demo/dashboard`
  - Test: Use in a component and verify navigation
  - Parallelizable: Yes

- [ ] **Task 4.2:** Update all navigation calls throughout app
  - Files: All components using `useNavigate()` or `<Link>`
  - Replace `navigate('/path')` with `tenantNavigate('/path')`
  - Replace `<Link to="/path">` with `<Link to={`/t/${tenantSlug}/path`}>`
  - Search pattern: `navigate\(["']/` and `to=["']/`
  - Test: Click through entire app, verify all links work
  - Parallelizable: No (depends on 4.1)

### Phase 5: Error Handling & Polish (2 tasks)

- [ ] **Task 5.1:** Add tenant validation and error pages
  - Files:
    - `apps/web/src/pages/TenantNotFoundPage.tsx` (new)
    - `apps/web/src/pages/TenantSuspendedPage.tsx` (new)
  - Handle 404 (tenant not found)
  - Handle 403 (tenant suspended)
  - Add loading states in TenantLayout
  - Test: Navigate to `/t/invalid-slug` and verify error page
  - Parallelizable: Yes

- [ ] **Task 5.2:** Update landing page and public routes
  - File: `apps/web/src/pages/LandingPage.tsx`
  - Add tenant selection UI or redirect to `/t/demo/login`
  - Update public routes (if any) to NOT require tenant slug
  - Test: Navigate to `/` and verify behavior
  - Parallelizable: Yes

---

## Testing Checklist

After all tasks complete:

- [ ] Login at `/t/demo/login` works
- [ ] All protected routes accessible at `/t/demo/*`
- [ ] Navigation between pages preserves tenant slug
- [ ] API calls include tenant context
- [ ] Invalid tenant slug shows error page
- [ ] Switching tenants (if supported) works correctly
- [ ] Browser back/forward buttons work correctly
- [ ] Direct URL navigation works (e.g., bookmark `/t/demo/employees`)

---

## Rollback Plan

If issues arise:

1. Revert backend middleware mounting (Task 1.1)
2. Revert frontend routing changes (Task 2.2)
3. Restore old LoginPage with form input (Task 2.3)
4. System returns to current state (tenant from JWT only)

---

## Notes

- **Backend is 80% ready** - tenant-context middleware already exists
- **Frontend needs significant refactoring** - all routes must be updated
- **No database changes required** - tenant slug already in database
- **JWT tokens unchanged** - still include tenantId for validation
- **Tenant isolation still works** - backend queries already filter by tenantId

---

## Success Criteria

✅ All URLs follow pattern: `https://time.lsltgroup.es/t/{tenantSlug}/*`  
✅ Tenant context extracted from URL path (not form input)  
✅ Backend middleware validates tenant on every request  
✅ Frontend navigation preserves tenant slug  
✅ API calls include tenant context automatically  
✅ Error handling for invalid/suspended tenants  
✅ All existing functionality works with new URL structure
