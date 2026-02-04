/**
 * Torre Tempo Tenant Layout
 *
 * Root layout component for tenant-scoped routes (/t/:tenantSlug/...).
 * Provides tenant context to all child routes and handles:
 * - Loading state while fetching tenant
 * - Error states for invalid/suspended tenants
 * - Renders nested routes via Outlet
 */

import { Outlet, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { TenantProvider, useTenant } from "../contexts/TenantContext";
import type { TenantError } from "../types/tenant";

// ============================================================================
// Loading Component
// ============================================================================

function TenantLoading() {
  const { t } = useTranslation();

  return (
    <div className="tenant-layout-loading">
      <div className="loading-container">
        <div className="loading-spinner">
          <div className="spinner-ring" />
          <div className="spinner-ring" />
          <div className="spinner-ring" />
        </div>
        <p className="loading-text">{t("common.loading", "Loading...")}</p>
      </div>

      <style>{`
        .tenant-layout-loading {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
        }

        .loading-spinner {
          position: relative;
          width: 64px;
          height: 64px;
        }

        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 3px solid transparent;
          border-radius: 50%;
          animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }

        .spinner-ring:nth-child(1) {
          border-top-color: var(--color-primary, #6366f1);
          animation-delay: -0.45s;
        }

        .spinner-ring:nth-child(2) {
          border-top-color: var(--color-secondary, #8b5cf6);
          animation-delay: -0.3s;
        }

        .spinner-ring:nth-child(3) {
          border-top-color: var(--color-accent, #f59e0b);
          animation-delay: -0.15s;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-text {
          color: var(--text-secondary, #64748b);
          font-size: 1rem;
          font-weight: 500;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Error Component
// ============================================================================

interface TenantErrorDisplayProps {
  error: TenantError;
  tenantSlug: string;
}

function TenantErrorDisplay({ error, tenantSlug }: TenantErrorDisplayProps) {
  const { t } = useTranslation();

  // Error-specific content
  const errorContent = {
    TENANT_NOT_FOUND: {
      icon: "404",
      title: t("tenant.error.notFound.title", "Tenant Not Found"),
      description: t(
        "tenant.error.notFound.description",
        `The organization "${tenantSlug}" does not exist or the URL may be incorrect.`,
      ),
      suggestion: t(
        "tenant.error.notFound.suggestion",
        "Please check the URL and try again.",
      ),
    },
    TENANT_SUSPENDED: {
      icon: "SUSPENDED",
      title: t("tenant.error.suspended.title", "Account Suspended"),
      description: t(
        "tenant.error.suspended.description",
        `The organization "${tenantSlug}" has been suspended.`,
      ),
      suggestion: t(
        "tenant.error.suspended.suggestion",
        "Please contact your administrator for assistance.",
      ),
    },
    TENANT_INACTIVE: {
      icon: "INACTIVE",
      title: t("tenant.error.inactive.title", "Account Inactive"),
      description: t(
        "tenant.error.inactive.description",
        `The organization "${tenantSlug}" is no longer active.`,
      ),
      suggestion: t(
        "tenant.error.inactive.suggestion",
        "This account may have been deactivated.",
      ),
    },
    NETWORK_ERROR: {
      icon: "OFFLINE",
      title: t("tenant.error.network.title", "Connection Error"),
      description: t(
        "tenant.error.network.description",
        "Unable to connect to the server.",
      ),
      suggestion: t(
        "tenant.error.network.suggestion",
        "Please check your internet connection and try again.",
      ),
    },
    UNKNOWN_ERROR: {
      icon: "ERROR",
      title: t("tenant.error.unknown.title", "Something Went Wrong"),
      description:
        error.message ||
        t("tenant.error.unknown.description", "An unexpected error occurred."),
      suggestion: t(
        "tenant.error.unknown.suggestion",
        "Please try again or contact support.",
      ),
    },
  };

  const content = errorContent[error.code] || errorContent.UNKNOWN_ERROR;

  return (
    <div className="tenant-error-page">
      <div className="error-container">
        {/* Error Icon */}
        <div className="error-icon" data-error={error.code}>
          <span className="error-code">{content.icon}</span>
        </div>

        {/* Error Content */}
        <div className="error-content">
          <h1 className="error-title">{content.title}</h1>
          <p className="error-description">{content.description}</p>
          <p className="error-suggestion">{content.suggestion}</p>
        </div>

        {/* Actions */}
        <div className="error-actions">
          {error.code === "NETWORK_ERROR" && (
            <button
              className="error-button primary"
              onClick={() => window.location.reload()}
            >
              {t("common.tryAgain", "Try Again")}
            </button>
          )}
          <Link to="/login" className="error-button secondary">
            {t("common.backToLogin", "Back to Login")}
          </Link>
        </div>
      </div>

      <style>{`
        .tenant-error-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
        }

        .error-container {
          max-width: 480px;
          width: 100%;
          text-align: center;
        }

        .error-icon {
          width: 120px;
          height: 120px;
          margin: 0 auto 2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.05) 100%);
          border: 2px solid rgba(239, 68, 68, 0.2);
        }

        .error-icon[data-error="TENANT_SUSPENDED"] {
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%);
          border-color: rgba(245, 158, 11, 0.2);
        }

        .error-icon[data-error="TENANT_INACTIVE"] {
          background: linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(107, 114, 128, 0.05) 100%);
          border-color: rgba(107, 114, 128, 0.2);
        }

        .error-icon[data-error="NETWORK_ERROR"] {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%);
          border-color: rgba(59, 130, 246, 0.2);
        }

        .error-code {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--color-error, #ef4444);
          letter-spacing: 0.05em;
        }

        .error-icon[data-error="TENANT_SUSPENDED"] .error-code {
          color: var(--color-warning, #f59e0b);
        }

        .error-icon[data-error="TENANT_INACTIVE"] .error-code {
          color: var(--text-muted, #6b7280);
        }

        .error-icon[data-error="NETWORK_ERROR"] .error-code {
          color: var(--color-info, #3b82f6);
        }

        .error-content {
          margin-bottom: 2rem;
        }

        .error-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary, #1e293b);
          margin: 0 0 1rem;
        }

        .error-description {
          font-size: 1rem;
          color: var(--text-secondary, #64748b);
          margin: 0 0 0.5rem;
          line-height: 1.6;
        }

        .error-suggestion {
          font-size: 0.875rem;
          color: var(--text-muted, #94a3b8);
          margin: 0;
        }

        .error-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .error-button {
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .error-button.primary {
          background: linear-gradient(135deg, var(--color-primary, #6366f1) 0%, var(--color-secondary, #8b5cf6) 100%);
          color: white;
        }

        .error-button.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .error-button.secondary {
          background: var(--bg-tertiary, #f1f5f9);
          color: var(--text-primary, #1e293b);
        }

        .error-button.secondary:hover {
          background: var(--bg-hover, #e2e8f0);
        }

        /* Dark mode support */
        [data-theme="dark"] .error-title {
          color: var(--text-primary, #f1f5f9);
        }

        [data-theme="dark"] .error-description {
          color: var(--text-secondary, #94a3b8);
        }

        [data-theme="dark"] .error-button.secondary {
          background: var(--bg-tertiary, #334155);
          color: var(--text-primary, #f1f5f9);
        }

        [data-theme="dark"] .error-button.secondary:hover {
          background: var(--bg-hover, #475569);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Content Component (uses context after provider)
// ============================================================================

function TenantLayoutContent() {
  const { tenantSlug, isLoading, error } = useTenant();

  // Show loading state
  if (isLoading) {
    return <TenantLoading />;
  }

  // Show error state
  if (error) {
    return <TenantErrorDisplay error={error} tenantSlug={tenantSlug} />;
  }

  // Tenant loaded successfully - render child routes
  return <Outlet />;
}

// ============================================================================
// Main Layout Component
// ============================================================================

/**
 * TenantLayout - Wraps tenant-scoped routes with TenantProvider
 *
 * Usage in router:
 * ```tsx
 * <Route path="/t/:tenantSlug" element={<TenantLayout />}>
 *   <Route element={<ProtectedRoute />}>
 *     <Route index element={<Dashboard />} />
 *     <Route path="employees" element={<Employees />} />
 *   </Route>
 * </Route>
 * ```
 */
export default function TenantLayout() {
  return (
    <TenantProvider>
      <TenantLayoutContent />
    </TenantProvider>
  );
}

// Named exports for flexibility
export { TenantProvider, TenantLoading, TenantErrorDisplay };
