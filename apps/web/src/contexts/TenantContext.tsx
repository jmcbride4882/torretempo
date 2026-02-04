/**
 * Torre Tempo Tenant Context
 *
 * Provides tenant data for path-based multi-tenancy:
 * - Extracts tenantSlug from URL using React Router
 * - Fetches tenant data when slug changes
 * - Handles loading, error, and suspended tenant states
 * - URL is the source of truth (no localStorage)
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useParams } from "react-router-dom";
import { apiClient } from "../services/api";
import { useAuthStore } from "../stores/authStore";
import type { Tenant, TenantContextType, TenantError } from "../types/tenant";

// ============================================================================
// Context
// ============================================================================

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Maps API error responses to TenantError type
 */
function mapErrorToTenantError(error: unknown, slug: string): TenantError {
  // Type guard for axios error
  if (error && typeof error === "object" && "response" in error) {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { code?: string; message?: string };
      };
    };
    const status = axiosError.response?.status;
    const apiCode = axiosError.response?.data?.code;
    const apiMessage = axiosError.response?.data?.message;

    if (status === 404) {
      return {
        code: "TENANT_NOT_FOUND",
        message: apiMessage || `Tenant '${slug}' not found`,
        status: 404,
      };
    }

    if (status === 403) {
      // Check for suspended vs inactive
      if (apiCode === "TENANT_SUSPENDED") {
        return {
          code: "TENANT_SUSPENDED",
          message: apiMessage || `Tenant '${slug}' has been suspended`,
          status: 403,
        };
      }
      return {
        code: "TENANT_INACTIVE",
        message: apiMessage || `Tenant '${slug}' is inactive`,
        status: 403,
      };
    }

    // Network error (no response)
    if (!axiosError.response) {
      return {
        code: "NETWORK_ERROR",
        message: "Unable to connect to server. Please check your connection.",
      };
    }
  }

  // Unknown error
  return {
    code: "UNKNOWN_ERROR",
    message:
      error instanceof Error ? error.message : "An unexpected error occurred",
  };
}

// ============================================================================
// Provider Component
// ============================================================================

interface TenantProviderProps {
  children: React.ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  // Extract tenantSlug from URL params (e.g., /t/:tenantSlug/...)
  const { tenantSlug = "" } = useParams<{ tenantSlug: string }>();

  // State
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<TenantError | null>(null);

  /**
   * Fetch tenant data from API or auth store
   */
  const fetchTenant = useCallback(async () => {
    // No slug = nothing to fetch
    if (!tenantSlug) {
      setTenant(null);
      setIsLoading(false);
      setError({
        code: "TENANT_NOT_FOUND",
        message: "No tenant specified in URL",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if tenant is already in auth store
      const authTenant = useAuthStore.getState().tenant;
      if (authTenant && authTenant.slug === tenantSlug) {
        // Use tenant from auth store (already loaded from login response)
        setTenant(authTenant);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Fetch tenant by slug from API
      const response = await apiClient.get<Tenant>(
        `/tenants/by-slug/${tenantSlug}`,
      );
      const tenantData = response.data;

      // Check tenant status
      if (tenantData.status === "SUSPENDED") {
        setTenant(null);
        setError({
          code: "TENANT_SUSPENDED",
          message: `Tenant '${tenantSlug}' has been suspended. Please contact support.`,
          status: 403,
        });
        return;
      }

      if (tenantData.status === "INACTIVE") {
        setTenant(null);
        setError({
          code: "TENANT_INACTIVE",
          message: `Tenant '${tenantSlug}' is no longer active.`,
          status: 403,
        });
        return;
      }

      // Success - tenant is active
      setTenant(tenantData);
      setError(null);
    } catch (err) {
      console.error("[TenantContext] Failed to fetch tenant:", err);
      setTenant(null);
      setError(mapErrorToTenantError(err, tenantSlug));
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  // Fetch tenant when slug changes
  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<TenantContextType>(
    () => ({
      tenant,
      tenantSlug,
      isLoading,
      error,
      refetch: fetchTenant,
    }),
    [tenant, tenantSlug, isLoading, error, fetchTenant],
  );

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access tenant context
 * Must be used within a TenantProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tenant, tenantSlug, isLoading, error } = useTenant();
 *
 *   if (isLoading) return <Spinner />;
 *   if (error) return <TenantError error={error} />;
 *
 *   return <div>Welcome to {tenant?.legalName}</div>;
 * }
 * ```
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);

  if (context === undefined) {
    throw new Error("useTenant must be used within a TenantProvider");
  }

  return context;
}

export default TenantContext;
