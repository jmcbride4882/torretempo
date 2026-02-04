import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../contexts/TenantContext";
import { useAuthorization } from "../hooks/useAuthorization";
import { MODULES, type ModuleKey } from "../hooks/useModule";
import "./UpgradePage.css";

/**
 * Upgrade Page - Plan Comparison & Module Catalog
 *
 * Displays 4 pricing tiers and 7 paid modules with emphasis
 * on compliance_pack for Spanish market.
 *
 * SECURITY: Only accessible to OWNER and ADMIN roles
 */

interface PricingTier {
  id: string;
  name: { en: string; es: string };
  price: number | null;
  priceLabel?: { en: string; es: string };
  maxEmployees: number | "unlimited";
  features: { en: string; es: string }[];
  modules: ModuleKey[];
  popular?: boolean;
  cta: { en: string; es: string };
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "core",
    name: { en: "Core", es: "Core" },
    price: 19,
    maxEmployees: 10,
    features: [
      { en: "Up to 10 employees", es: "Hasta 10 empleados" },
      { en: "Basic time tracking", es: "Control horario basico" },
      { en: "Basic scheduling", es: "Planificacion basica" },
      { en: "Email support", es: "Soporte por email" },
    ],
    modules: [],
    cta: { en: "Get Started", es: "Comenzar" },
  },
  {
    id: "pro",
    name: { en: "Pro", es: "Pro" },
    price: 49,
    maxEmployees: 50,
    features: [
      { en: "Up to 50 employees", es: "Hasta 50 empleados" },
      { en: "Advanced time tracking", es: "Control horario avanzado" },
      { en: "Advanced scheduling", es: "Planificacion avanzada" },
      { en: "Approvals workflow", es: "Flujo de aprobaciones" },
      { en: "Priority support", es: "Soporte prioritario" },
    ],
    modules: ["advanced_scheduling", "approvals_workflow"],
    popular: true,
    cta: { en: "Upgrade to Pro", es: "Actualizar a Pro" },
  },
  {
    id: "advanced",
    name: { en: "Advanced", es: "Avanzado" },
    price: 99,
    maxEmployees: 200,
    features: [
      { en: "Up to 200 employees", es: "Hasta 200 empleados" },
      { en: "All Pro features", es: "Todas las funciones Pro" },
      { en: "RDL 8/2019 Compliance", es: "Cumplimiento RDL 8/2019" },
      { en: "GPS verification", es: "Verificacion GPS" },
      { en: "Analytics & insights", es: "Analiticas e informes" },
      { en: "Dedicated support", es: "Soporte dedicado" },
    ],
    modules: [
      "advanced_scheduling",
      "approvals_workflow",
      "compliance_pack",
      "geo_verification",
      "analytics_insights",
    ],
    cta: { en: "Upgrade to Advanced", es: "Actualizar a Avanzado" },
  },
  {
    id: "enterprise",
    name: { en: "Enterprise", es: "Enterprise" },
    price: null,
    priceLabel: { en: "Custom", es: "Personalizado" },
    maxEmployees: "unlimited",
    features: [
      { en: "Unlimited employees", es: "Empleados ilimitados" },
      { en: "All Advanced features", es: "Todas las funciones Avanzado" },
      { en: "API integrations", es: "Integraciones API" },
      { en: "White label branding", es: "Marca blanca" },
      { en: "Custom SLA", es: "SLA personalizado" },
      { en: "Dedicated account manager", es: "Gerente de cuenta dedicado" },
    ],
    modules: [
      "advanced_scheduling",
      "approvals_workflow",
      "compliance_pack",
      "geo_verification",
      "analytics_insights",
      "api_integrations",
      "white_label",
    ],
    cta: { en: "Contact Sales", es: "Contactar Ventas" },
  },
];

export default function UpgradePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { tenantSlug, isLoading: tenantLoading } = useTenant();
  const { canManageBilling } = useAuthorization();
  const [activeTab, setActiveTab] = useState<"plans" | "modules">("plans");

  const isSpanish = i18n.language === "es";

  // Get localized text
  const getText = (obj: { en: string; es: string }) =>
    isSpanish ? obj.es : obj.en;

  // Handle plan selection
  const handleSelectPlan = (tierId: string) => {
    if (tierId === "enterprise") {
      // Open contact form or email
      window.location.href =
        "mailto:sales@torretempo.com?subject=Enterprise%20Plan%20Inquiry";
    } else {
      // TODO: Implement Stripe checkout
      alert(t("billing.upgrade.checkoutComingSoon"));
    }
  };

  // Handle module purchase
  const handleSelectModule = (_moduleKey: ModuleKey) => {
    // TODO: Implement module purchase
    alert(t("billing.upgrade.moduleCheckoutComingSoon"));
  };

  // Get module icon
  const getModuleIcon = (icon: string) => {
    const icons: Record<string, JSX.Element> = {
      calendar: (
        <svg
          width="24"
          height="24"
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
      shield: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      ),
      "check-circle": (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      "map-pin": (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
      "bar-chart": (
        <svg
          width="24"
          height="24"
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
      code: (
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      ),
      palette: (
        <svg
          width="24"
          height="24"
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
    return icons[icon] || icons["shield"];
  };

  // Permission check
  if (!canManageBilling()) {
    return (
      <div className="upgrade-page">
        <div className="upgrade-error">
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
  if (tenantLoading) {
    return (
      <div className="upgrade-page">
        <div className="upgrade-loading">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="upgrade-page">
      {/* Header */}
      <div className="upgrade-header">
        <button
          className="back-button"
          onClick={() => navigate(`/t/${tenantSlug}/billing`)}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {t("common.back")}
        </button>

        <div className="header-content">
          <h1>{t("billing.upgrade.title")}</h1>
          <p className="header-subtitle">{t("billing.upgrade.subtitle")}</p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button
            className={`tab-btn ${activeTab === "plans" ? "active" : ""}`}
            onClick={() => setActiveTab("plans")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            {t("billing.upgrade.comparePlans")}
          </button>
          <button
            className={`tab-btn ${activeTab === "modules" ? "active" : ""}`}
            onClick={() => setActiveTab("modules")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            {t("billing.upgrade.addOnModules")}
          </button>
        </div>
      </div>

      {/* Plans Tab */}
      {activeTab === "plans" && (
        <div className="pricing-grid">
          {PRICING_TIERS.map((tier, index) => (
            <div
              key={tier.id}
              className={`pricing-card ${tier.popular ? "popular" : ""}`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {tier.popular && (
                <div className="popular-badge">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16l-6.4 5.2L8 14 2 9.2h7.6L12 2z" />
                  </svg>
                  {t("billing.upgrade.mostPopular")}
                </div>
              )}

              <div className="pricing-header">
                <h3 className="plan-name">{getText(tier.name)}</h3>
                <div className="plan-price">
                  {tier.price !== null ? (
                    <>
                      <span className="price-value">{tier.price}</span>
                      <span className="price-period">
                        /{t("billing.month")}
                      </span>
                    </>
                  ) : (
                    <span className="price-custom">
                      {getText(tier.priceLabel!)}
                    </span>
                  )}
                </div>
                <div className="plan-employees">
                  {tier.maxEmployees === "unlimited"
                    ? t("billing.upgrade.unlimitedEmployees")
                    : t("billing.upgrade.upToEmployees", {
                        count: tier.maxEmployees,
                      })}
                </div>
              </div>

              <ul className="features-list">
                {tier.features.map((feature, idx) => (
                  <li key={idx}>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {getText(feature)}
                  </li>
                ))}
              </ul>

              {tier.modules.length > 0 && (
                <div className="included-modules">
                  <span className="modules-label">
                    {t("billing.upgrade.includedModules")}:
                  </span>
                  <div className="modules-icons">
                    {tier.modules.map((moduleKey) => {
                      const mod = MODULES[moduleKey];
                      return (
                        <div
                          key={moduleKey}
                          className="module-icon-small"
                          title={isSpanish ? mod.nameEs : mod.name}
                        >
                          {getModuleIcon(mod.icon)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                className={`plan-cta ${tier.popular ? "cta-primary" : "cta-secondary"}`}
                onClick={() => handleSelectPlan(tier.id)}
              >
                {getText(tier.cta)}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modules Tab */}
      {activeTab === "modules" && (
        <div className="modules-section">
          {/* Compliance Pack Featured */}
          <div className="compliance-featured">
            <div className="compliance-icon-large">
              {getModuleIcon("shield")}
            </div>
            <div className="compliance-featured-content">
              <div className="compliance-badges">
                <span className="badge-es">ES</span>
                <span className="badge-required">
                  {t("billing.modules.requiredBadge")}
                </span>
              </div>
              <h2>
                {isSpanish
                  ? MODULES.compliance_pack.nameEs
                  : MODULES.compliance_pack.name}
              </h2>
              <p>
                {isSpanish
                  ? MODULES.compliance_pack.descriptionEs
                  : MODULES.compliance_pack.description}
              </p>
              <ul className="compliance-features">
                <li>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("billing.modules.compliance.feature1")}
                </li>
                <li>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("billing.modules.compliance.feature2")}
                </li>
                <li>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  {t("billing.modules.compliance.feature3")}
                </li>
              </ul>
              <div className="compliance-pricing">
                <span className="module-price">25</span>
                <span className="module-price-period">
                  /{t("billing.month")}
                </span>
              </div>
              <button
                className="compliance-cta-btn"
                onClick={() => handleSelectModule("compliance_pack")}
              >
                {t("billing.modules.addModule")}
              </button>
            </div>
          </div>

          {/* Other Modules Grid */}
          <h3 className="modules-grid-title">
            {t("billing.upgrade.otherModules")}
          </h3>
          <div className="modules-grid">
            {Object.values(MODULES)
              .filter((m) => m.key !== "compliance_pack")
              .map((module, index) => (
                <div
                  key={module.key}
                  className={`module-card tier-${module.tier}`}
                  style={{ animationDelay: `${index * 0.08}s` }}
                >
                  <div className="module-card-icon">
                    {getModuleIcon(module.icon)}
                  </div>
                  <div className="module-card-content">
                    <div className="module-card-header">
                      <h4>{isSpanish ? module.nameEs : module.name}</h4>
                      <span className={`tier-badge tier-${module.tier}`}>
                        {module.tier}
                      </span>
                    </div>
                    <p>
                      {isSpanish ? module.descriptionEs : module.description}
                    </p>
                    <div className="module-card-footer">
                      {module.price !== null ? (
                        <div className="module-card-price">
                          <span className="price">{module.price}</span>
                          <span className="period">/{t("billing.month")}</span>
                        </div>
                      ) : (
                        <span className="price-custom">
                          {t("billing.customPricing")}
                        </span>
                      )}
                      <button
                        className="module-add-btn"
                        onClick={() => handleSelectModule(module.key)}
                      >
                        {t("billing.modules.add")}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="upgrade-faq">
        <h3>{t("billing.upgrade.faq.title")}</h3>
        <div className="faq-grid">
          <div className="faq-item">
            <h4>{t("billing.upgrade.faq.q1")}</h4>
            <p>{t("billing.upgrade.faq.a1")}</p>
          </div>
          <div className="faq-item">
            <h4>{t("billing.upgrade.faq.q2")}</h4>
            <p>{t("billing.upgrade.faq.a2")}</p>
          </div>
          <div className="faq-item">
            <h4>{t("billing.upgrade.faq.q3")}</h4>
            <p>{t("billing.upgrade.faq.a3")}</p>
          </div>
          <div className="faq-item">
            <h4>{t("billing.upgrade.faq.q4")}</h4>
            <p>{t("billing.upgrade.faq.a4")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
