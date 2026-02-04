// ============================================================================
// Tenant Status
// ============================================================================

export type TenantStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

// ============================================================================
// Core Tenant Interface
// ============================================================================

export interface Tenant {
  id: string;
  slug: string;
  legalName: string;
  status?: TenantStatus;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
  settings?: {
    locations?: string[];
    roles?: Array<{
      name: string;
      color: string;
    }>;
  };
}

// ============================================================================
// Tenant Context Types
// ============================================================================

export interface TenantError {
  code:
    | "TENANT_NOT_FOUND"
    | "TENANT_SUSPENDED"
    | "TENANT_INACTIVE"
    | "NETWORK_ERROR"
    | "UNKNOWN_ERROR";
  message: string;
  status?: number;
}

export interface TenantContextType {
  /** Current tenant data (null if not loaded or error) */
  tenant: Tenant | null;
  /** Tenant slug extracted from URL */
  tenantSlug: string;
  /** Loading state while fetching tenant */
  isLoading: boolean;
  /** Error state if tenant fetch failed */
  error: TenantError | null;
  /** Refetch tenant data */
  refetch: () => Promise<void>;
}

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
}

export interface SmtpTestResult {
  success: boolean;
  message: string;
}
