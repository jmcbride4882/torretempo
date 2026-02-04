import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../../contexts/TenantContext";
import { MODULES, type ModuleKey } from "../../hooks/useModule";
import "./ModuleLockedPanel.css";

interface ModuleLockedPanelProps {
  moduleKey: ModuleKey;
  /** Custom title override */
  title?: string;
  /** Custom description override */
  description?: string;
  /** Show module pricing info */
  showPricing?: boolean;
  /** Compact mode for inline display */
  compact?: boolean;
}

/**
 * ModuleLockedPanel - Displays when a user tries to access a locked feature
 *
 * Shows the module name, description, and upgrade CTA
 * Supports both full-page and compact inline modes
 *
 * @example
 * ```tsx
 * import { useModule } from '../hooks/useModule';
 * import ModuleLockedPanel from '../components/billing/ModuleLockedPanel';
 *
 * function AdvancedSchedulingPage() {
 *   const { enabled } = useModule('advanced_scheduling');
 *
 *   if (!enabled) {
 *     return <ModuleLockedPanel moduleKey="advanced_scheduling" />;
 *   }
 *
 *   return <div>Advanced scheduling content...</div>;
 * }
 * ```
 */
export default function ModuleLockedPanel({
  moduleKey,
  title,
  description,
  showPricing = true,
  compact = false,
}: ModuleLockedPanelProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tenantSlug } = useTenant();

  const module = MODULES[moduleKey];
  const isSpanish = i18n.language === "es";

  // Get localized module info
  const moduleName = isSpanish ? module?.nameEs : module?.name;
  const moduleDescription = isSpanish
    ? module?.descriptionEs
    : module?.description;
  const moduleBadge = isSpanish ? module?.badgeEs : module?.badge;

  // Display values with fallbacks
  const displayTitle = title || t("billing.locked.title");
  const displayDescription =
    description || moduleDescription || t("billing.locked.description");

  // Navigate to upgrade page
  const handleUpgradeClick = () => {
    const path = tenantSlug
      ? `/t/${tenantSlug}/billing/upgrade`
      : "/billing/upgrade";
    navigate(path);
  };

  // Icon mapping
  const getIcon = () => {
    switch (module?.icon) {
      case "calendar":
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "shield":
        return (
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
        );
      case "check-circle":
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        );
      case "map-pin":
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        );
      case "bar-chart":
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <line x1="12" y1="20" x2="12" y2="10" />
            <line x1="18" y1="20" x2="18" y2="4" />
            <line x1="6" y1="20" x2="6" y2="16" />
          </svg>
        );
      case "code":
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
        );
      case "palette":
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.68 1.5-1.5 0-.39-.14-.76-.37-1.03-.22-.26-.37-.63-.37-1.03 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8z" />
            <circle cx="7.5" cy="11.5" r="1.5" />
            <circle cx="10.5" cy="7.5" r="1.5" />
            <circle cx="14.5" cy="7.5" r="1.5" />
            <circle cx="17.5" cy="11.5" r="1.5" />
          </svg>
        );
      default:
        return (
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
    }
  };

  // Tier badge color
  const getTierClass = () => {
    switch (module?.tier) {
      case "pro":
        return "tier-pro";
      case "advanced":
        return "tier-advanced";
      case "enterprise":
        return "tier-enterprise";
      default:
        return "";
    }
  };

  if (compact) {
    return (
      <div className="module-locked-panel-compact">
        <div className="locked-compact-icon">{getIcon()}</div>
        <div className="locked-compact-content">
          <h4 className="locked-compact-title">{moduleName || displayTitle}</h4>
          <p className="locked-compact-description">{displayDescription}</p>
        </div>
        <button className="locked-compact-btn" onClick={handleUpgradeClick}>
          {t("billing.locked.upgradeButton")}
        </button>
      </div>
    );
  }

  return (
    <div className="module-locked-panel">
      <div className="locked-panel-content">
        {/* Lock Icon with Gradient Background */}
        <div className="locked-icon-wrapper">
          <div className="locked-icon-bg" />
          {getIcon()}
        </div>

        {/* Module Badge */}
        {moduleBadge && (
          <div className="locked-module-badge">
            <span className="badge-flag">
              {moduleKey === "compliance_pack" ? "ES" : "PRO"}
            </span>
            {moduleBadge}
          </div>
        )}

        {/* Title & Description */}
        <h1 className="locked-title">
          {moduleName || t("billing.locked.featureLockedTitle")}
        </h1>
        <p className="locked-subtitle">{displayDescription}</p>

        {/* Tier Badge */}
        {module && (
          <div className={`locked-tier-badge ${getTierClass()}`}>
            {module.tier.charAt(0).toUpperCase() + module.tier.slice(1)}{" "}
            {t("billing.tier")}
          </div>
        )}

        {/* Pricing Info */}
        {showPricing && module && (
          <div className="locked-pricing">
            {module.price !== null ? (
              <>
                <span className="locked-price">{module.price}</span>
                <span className="locked-price-currency">/mo</span>
              </>
            ) : (
              <span className="locked-price-custom">
                {t("billing.customPricing")}
              </span>
            )}
          </div>
        )}

        {/* CTA Button */}
        <button className="locked-upgrade-btn" onClick={handleUpgradeClick}>
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
          {t("billing.locked.upgradeButton")}
        </button>

        {/* Secondary CTA */}
        <button className="locked-learn-more" onClick={handleUpgradeClick}>
          {t("billing.locked.learnMore")}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Decorative Elements */}
      <div className="locked-panel-decoration">
        <div className="decoration-circle decoration-1" />
        <div className="decoration-circle decoration-2" />
        <div className="decoration-circle decoration-3" />
      </div>
    </div>
  );
}
