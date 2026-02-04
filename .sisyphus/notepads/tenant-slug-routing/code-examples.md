# Multi-Tenant Routing Code Examples

## 1. Route Structure

```tsx
// App.tsx
import { Routes, Route, Navigate } from 'react-router-dom';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      
      {/* Tenant-scoped routes */}
      <Route path="/t/:tenantSlug" element={<TenantLayout />}>
        <Route element={<ProtectedRoutes />}>
          <Route element={<TenantAccess />}>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="time-tracking" element={<TimeTracking />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
```

## 2. Tenant Context

```tsx
// contexts/TenantContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

interface Tenant {
  id: string;
  slug: string;
  name: string;
}

interface TenantContextValue {
  currentTenant: Tenant | null;
  tenantSlug: string;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const navigate = useNavigate();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tenantSlug) {
      setIsLoading(false);
      return;
    }

    const fetchTenant = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tenants/by-slug/${tenantSlug}`);
        if (!response.ok) throw new Error('Tenant not found');
        const tenant = await response.json();
        setCurrentTenant(tenant);
      } catch (error) {
        console.error('Failed to load tenant:', error);
        navigate('/login', { replace: true });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenant();
  }, [tenantSlug, navigate]);

  return (
    <TenantContext.Provider value={{ currentTenant, tenantSlug: tenantSlug || '', isLoading }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) throw new Error('useTenant must be used within TenantProvider');
  return context;
};
```

## 3. Protected Routes

```tsx
// components/ProtectedRoutes.tsx
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoutes: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading || !isAuthenticated) return null;
  return <Outlet />;
};
```

```tsx
// components/TenantAccess.tsx
import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';

export const TenantAccess: React.FC = () => {
  const { currentTenant, tenantSlug, isLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !currentTenant && tenantSlug) {
      console.error(`Access denied: ${tenantSlug}`);
      navigate('/select-tenant', { replace: true });
    }
  }, [currentTenant, tenantSlug, isLoading, navigate]);

  if (isLoading || !currentTenant) return null;
  return <Outlet />;
};
```

## 4. API Client with Tenant Header

```typescript
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  // Add auth token
  const token = localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add tenant context from URL
  const pathMatch = window.location.pathname.match(/^\/t\/([^/]+)/);
  if (pathMatch && pathMatch[1] && config.headers) {
    config.headers['X-Tenant-Slug'] = pathMatch[1];
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

## 5. Navigation Helpers

```typescript
// hooks/useTenantNavigate.ts
import { useNavigate } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';

export const useTenantNavigate = () => {
  const navigate = useNavigate();
  const { tenantSlug } = useTenant();

  return (path: string, options?: any) => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    navigate(`/t/${tenantSlug}/${cleanPath}`, options);
  };
};
```

```tsx
// components/TenantLink.tsx
import { Link, LinkProps } from 'react-router-dom';
import { useTenant } from '@/contexts/TenantContext';

interface TenantLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
}

export const TenantLink: React.FC<TenantLinkProps> = ({ to, ...props }) => {
  const { tenantSlug } = useTenant();
  const cleanPath = to.startsWith('/') ? to.slice(1) : to;
  return <Link to={`/t/${tenantSlug}/${cleanPath}`} {...props} />;
};
```

## 6. Backend Endpoint

```typescript
// apps/api/src/routes/tenant.routes.ts
import { Router } from 'express';
import { getTenantBySlug } from '../services/tenant.service';

const router = Router();

router.get('/tenants/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = await getTenantBySlug(slug);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    res.json(tenant);
  } catch (error) {
    console.error('Error fetching tenant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
```

## References
- Logto Console: https://github.com/logto-io/logto
- SaaS Boilerplate: https://github.com/apptension/saas-boilerplate
- React Router v6 Docs: https://reactrouter.com
