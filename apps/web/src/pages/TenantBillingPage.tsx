import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../contexts/TenantContext";
import { useAuthorization } from "../hooks/useAuthorization";
import { useAllModules, type ModuleKey } from "../hooks/useModule";
import "./TenantBillingPage.css";

/**
 * Tenant Billing Overview Page
 *
 * Shows current subscription details, employee usage, active modules,
 * trial status, and upgrade CTA for tenant owners/admins.
 *
 * SECURITY: Only accessible to OWNER and ADMIN roles
 */
export default function TenantBillingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tenant, tenantSlug, isLoading: tenantLoading } = useTenant();
  const { canViewBilling, canManageBilling } = useAuthorization();
  const {
    modules,
    inTrial,
    trialDaysLeft,
    isLoading: modulesLoading,
  } = useAllModules();

  const isSpanish = i18n.language === "es";

  // Extended tenant type with billing fields
  const tenantData = tenant as any;

  // Get subscription info from tenant
  const subscriptionStatus = tenantData?.subscriptionStatus || "trial";
  const subscriptionPlan = tenantData?.subscriptionPlan || "core";
  const employeeCount = tenantData?.employeeCount || 0;
  const maxEmployees = tenantData?.maxEmployees || 10;
  const currentPeriodEnd = tenantData?.currentPeriodEnd;
  const trialEndsAt = tenantData?.trialEndsAt;

  // Calculate employee usage percentage
  const employeeUsagePercent = maxEmployees
    ? Math.min((employeeCount / maxEmployees) * 100, 100)
    : 0;

  // Get enabled modules
  const enabledModules = modules.filter((m) => m.enabled);

  // Plan labels
  const getPlanLabel = (plan: string) => {
    const labels: Record<string, { en: string; es: string }> = {
      core: { en: "Core", es: "Core" },
      pro: { en: "Pro", es: "Pro" },
      advanced: { en: "Advanced", es: "Avanzado" },
      enterprise: { en: "Enterprise", es: "Enterprise" },
    };
    return isSpanish ? labels[plan]?.es || plan : labels[plan]?.en || plan;
  };

  // Plan prices
  const getPlanPrice = (plan: string) => {
    const prices: Record<string, number | null> = {
      core: 19,
      pro: 49,
      advanced: 99,
      enterprise: null,
    };
    return prices[plan];
  };

  // Status badge classes
  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      trial: "status-trial",
      active: "status-active",
      suspended: "status-suspended",
      cancelled: "status-cancelled",
    };
    return classes[status] || "";
  };

  // Navigate to upgrade page
  const handleUpgradeClick = () => {
    navigate(`/t/${tenantSlug}/billing/upgrade`);
  };

  // Request invoice
  const handleRequestInvoice = () => {
    // TODO: Implement invoice request
    alert(t("billing.overview.invoiceRequestSent"));
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(
      isSpanish ? "es-ES" : "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      },
    );
  };

  // Permission check
  if (!canViewBilling()) {
    return (
      <div className="tenant-billing-page">
        <div className="billing-error">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <h2>{t("billing.accessDenied")}</h2>
          <p>{t("billing.accessDeniedDescription")}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (tenantLoading || modulesLoading) {
    return (
      <div className="tenant-billing-page">
        <div className="billing-loading">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tenant-billing-page">
      {/* Header */}
      <div className="billing-header">
        <div className="header-content">
          <h1>{t("billing.overview.title")}</h1>
          <p className="header-subtitle">{t("billing.overview.subtitle")}</p>
        </div>
        {canManageBilling() && (
          <button className="btn-upgrade" onClick={handleUpgradeClick}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2L8 14 2 9.2h7.6L12 2z" />
            </svg>
            {t("billing.overview.upgradePlan")}
          </button>
        )}
      </div>

      {/* Trial Banner */}
      {inTrial && (
        <div className="trial-banner">
          <div className="trial-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="trial-content">
            <h3>{t("billing.trial.title")}</h3>
            <p>
              {t("billing.trial.daysRemaining", { days: trialDaysLeft })}
              {trialEndsAt &&
                ` - ${t("billing.trial.endsOn")} ${formatDate(trialEndsAt)}`}
            </p>
          </div>
          <button className="trial-cta" onClick={handleUpgradeClick}>
            {t("billing.trial.activateNow")}
          </button>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="billing-grid">
        {/* Current Plan Card */}
        <div className="billing-card plan-card">
          <div className="card-header">
            <h2>{t("billing.overview.currentPlan")}</h2>
            <span
              className={`status-badge ${getStatusClass(subscriptionStatus)}`}
            >
              {t(`billing.status.${subscriptionStatus}`)}
            </span>
          </div>

          <div className="plan-details">
            <div className="plan-name">
              <span className="plan-label">
                {getPlanLabel(subscriptionPlan)}
              </span>
              <span className="plan-badge">{t("billing.plan")}</span>
            </div>
            <div className="plan-price">
              {getPlanPrice(subscriptionPlan) !== null ? (
                <>
                  <span className="price-value">
                    {getPlanPrice(subscriptionPlan)}
                  </span>
                  <span className="price-period">/{t("billing.month")}</span>
                </>
              ) : (
                <span className="price-custom">
                  {t("billing.customPricing")}
                </span>
              )}
            </div>
          </div>

          {currentPeriodEnd && (
            <div className="billing-cycle">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>
                {t("billing.overview.nextBilling")}:{" "}
                {formatDate(currentPeriodEnd)}
              </span>
            </div>
          )}

          <div className="plan-actions">
            {canManageBilling() && (
              <>
                <button
                  className="btn-secondary"
                  onClick={handleRequestInvoice}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  {t("billing.overview.requestInvoice")}
                </button>
                <button className="btn-outline" onClick={handleUpgradeClick}>
                  {t("billing.overview.changePlan")}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Employee Usage Card */}
        <div className="billing-card usage-card">
          <div className="card-header">
            <h2>{t("billing.overview.employeeUsage")}</h2>
          </div>

          <div className="usage-display">
            <div className="usage-numbers">
              <span className="usage-current">{employeeCount}</span>
              <span className="usage-separator">/</span>
              <span className="usage-max">{maxEmployees}</span>
            </div>
            <span className="usage-label">
              {t("billing.overview.employees")}
            </span>
          </div>

          <div className="usage-bar-container">
            <div
              className={`usage-bar ${employeeUsagePercent >= 90 ? "usage-critical" : employeeUsagePercent >= 70 ? "usage-warning" : ""}`}
              style={{ width: `${employeeUsagePercent}%` }}
            />
          </div>

          {employeeUsagePercent >= 90 && (
            <div className="usage-warning-message">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{t("billing.overview.usageWarning")}</span>
            </div>
          )}

          {canManageBilling() && employeeUsagePercent >= 70 && (
            <button className="btn-increase" onClick={handleUpgradeClick}>
              {t("billing.overview.increaseLimit")}
            </button>
          )}
        </div>

        {/* Active Modules Card */}
        <div className="billing-card modules-card">
          <div className="card-header">
            <h2>{t("billing.overview.activeModules")}</h2>
            <span className="modules-count">
              {enabledModules.length} {t("billing.overview.modulesEnabled")}
            </span>
          </div>

          {enabledModules.length > 0 ? (
            <div className="modules-list">
              {enabledModules.map((module) => (
                <div key={module.key} className="module-item">
                  <div className="module-icon">{getModuleIcon(module.key)}</div>
                  <div className="module-info">
                    <span className="module-name">
                      {isSpanish ? module.nameEs : module.name}
                    </span>
                    {module.badge && (
                      <span className="module-badge-small">
                        {isSpanish ? module.badgeEs : module.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="modules-empty">
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <p>{t("billing.overview.noModules")}</p>
            </div>
          )}

          <button className="btn-browse-modules" onClick={handleUpgradeClick}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            {t("billing.overview.browseModules")}
          </button>
        </div>
      </div>

      {/* Compliance Pack CTA (if not enabled) */}
      {!enabledModules.find((m) => m.key === "compliance_pack") && (
        <div className="compliance-cta">
          <div className="compliance-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <div className="compliance-content">
            <span className="compliance-badge">ES</span>
            <h3>{t("billing.compliance.title")}</h3>
            <p>{t("billing.compliance.description")}</p>
          </div>
          <button className="compliance-btn" onClick={handleUpgradeClick}>
            {t("billing.compliance.learnMore")}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Get icon component for a module
 */
function getModuleIcon(moduleKey: ModuleKey) {
  const iconMap: Record<ModuleKey, JSX.Element> = {
    advanced_scheduling: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    compliance_pack: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-4" />
      </svg>
    ),
    approvals_workflow: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    geo_verification: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    analytics_insights: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <line x1="12" y1="20" x2="12" y2="10" />
        <line x1="18" y1="20" x2="18" y2="4" />
        <line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
    api_integrations: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    white_label: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.68 1.5-1.5 0-.39-.14-.76-.37-1.03-.22-.26-.37-.63-.37-1.03 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
        <circle cx="7.5" cy="11.5" r="1.5" />
        <circle cx="10.5" cy="7.5" r="1.5" />
        <circle cx="14.5" cy="7.5" r="1.5" />
        <circle cx="17.5" cy="11.5" r="1.5" />
      </svg>
    ),
  };

  return (
    iconMap[moduleKey] || (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    )
  );
}
