import { useTenant } from "../contexts/TenantContext";

/**
 * Module Keys for Paid Add-ons
 * These match the backend module identifiers
 */
export type ModuleKey =
  | "advanced_scheduling"
  | "compliance_pack"
  | "approvals_workflow"
  | "geo_verification"
  | "analytics_insights"
  | "api_integrations"
  | "white_label";

/**
 * Module metadata for display purposes
 */
export interface ModuleInfo {
  key: ModuleKey;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  icon: string;
  price: number | null; // null = custom pricing
  tier: "pro" | "advanced" | "enterprise";
  badge?: string;
  badgeEs?: string;
}

/**
 * All available paid modules with metadata
 */
export const MODULES: Record<ModuleKey, ModuleInfo> = {
  advanced_scheduling: {
    key: "advanced_scheduling",
    name: "Advanced Scheduling",
    nameEs: "Planificacion Avanzada",
    description: "Deputy-style drag-drop scheduling with conflict detection",
    descriptionEs: "Planificacion tipo Deputy con deteccion de conflictos",
    icon: "calendar",
    price: 15,
    tier: "pro",
  },
  compliance_pack: {
    key: "compliance_pack",
    name: "Compliance Pack",
    nameEs: "Pack de Cumplimiento",
    description:
      "RDL 8/2019 signed exports, 4-year retention, labor inspection ready",
    descriptionEs:
      "Exportaciones firmadas RDL 8/2019, retencion 4 anos, listo para inspeccion laboral",
    icon: "shield",
    price: 25,
    tier: "advanced",
    badge: "Required for Spanish Businesses",
    badgeEs: "Obligatorio para Empresas Espanolas",
  },
  approvals_workflow: {
    key: "approvals_workflow",
    name: "Approvals Workflow",
    nameEs: "Flujo de Aprobaciones",
    description:
      "Multi-level approval chains for time corrections and leave requests",
    descriptionEs:
      "Cadenas de aprobacion multi-nivel para correcciones y solicitudes",
    icon: "check-circle",
    price: 10,
    tier: "pro",
  },
  geo_verification: {
    key: "geo_verification",
    name: "Geo Verification",
    nameEs: "Verificacion Geografica",
    description: "GPS verification for clock in/out events",
    descriptionEs: "Verificacion GPS para fichajes de entrada/salida",
    icon: "map-pin",
    price: 10,
    tier: "advanced",
  },
  analytics_insights: {
    key: "analytics_insights",
    name: "Analytics & Insights",
    nameEs: "Analiticas e Informes",
    description: "Advanced reporting, overtime analysis, payroll export",
    descriptionEs:
      "Informes avanzados, analisis de horas extra, exportacion de nominas",
    icon: "bar-chart",
    price: 20,
    tier: "advanced",
  },
  api_integrations: {
    key: "api_integrations",
    name: "API Integrations",
    nameEs: "Integraciones API",
    description: "REST API access, webhooks, third-party integrations",
    descriptionEs: "Acceso API REST, webhooks, integraciones de terceros",
    icon: "code",
    price: null,
    tier: "enterprise",
  },
  white_label: {
    key: "white_label",
    name: "White Label",
    nameEs: "Marca Blanca",
    description: "Custom branding, custom domain, custom email templates",
    descriptionEs:
      "Marca personalizada, dominio propio, plantillas de email personalizadas",
    icon: "palette",
    price: null,
    tier: "enterprise",
  },
};

/**
 * Calculate days remaining from a date string
 */
function calculateDaysLeft(dateString: string | null | undefined): number {
  if (!dateString) return 0;

  const endDate = new Date(dateString);
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Hook result for module access checking
 */
export interface UseModuleResult {
  /** Whether the module is enabled for the current tenant */
  enabled: boolean;
  /** Whether the tenant is currently in trial period */
  inTrial: boolean;
  /** Days remaining in trial (0 if not in trial or expired) */
  trialDaysLeft: number;
  /** Module metadata */
  moduleInfo: ModuleInfo | null;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to check if a specific module is enabled for the current tenant
 *
 * @param moduleKey - The module identifier to check
 * @returns Object with enabled status, trial info, and module metadata
 *
 * @example
 * ```tsx
 * function AdvancedSchedulingPage() {
 *   const { enabled, inTrial, trialDaysLeft } = useModule('advanced_scheduling');
 *
 *   if (!enabled) {
 *     return <ModuleLockedPanel moduleKey="advanced_scheduling" />;
 *   }
 *
 *   return <div>Advanced scheduling content...</div>;
 * }
 * ```
 */
export function useModule(moduleKey: ModuleKey): UseModuleResult {
  const { tenant, isLoading } = useTenant();

  // Get module info
  const moduleInfo = MODULES[moduleKey] || null;

  // Check if module is enabled for this tenant
  // The tenant object should have an enabledModules array
  const enabledModules = (tenant as any)?.enabledModules || [];
  const enabled = enabledModules.includes(moduleKey);

  // Check if in trial period
  const subscriptionStatus = (tenant as any)?.subscriptionStatus || "";
  const inTrial = subscriptionStatus === "trial";
  const trialEndsAt = (tenant as any)?.trialEndsAt;
  const trialDaysLeft = inTrial ? calculateDaysLeft(trialEndsAt) : 0;

  return {
    enabled,
    inTrial,
    trialDaysLeft,
    moduleInfo,
    isLoading,
  };
}

/**
 * Hook to get all modules with their enabled status
 */
export function useAllModules() {
  const { tenant, isLoading } = useTenant();

  const enabledModules = (tenant as any)?.enabledModules || [];
  const subscriptionStatus = (tenant as any)?.subscriptionStatus || "";
  const inTrial = subscriptionStatus === "trial";
  const trialEndsAt = (tenant as any)?.trialEndsAt;
  const trialDaysLeft = inTrial ? calculateDaysLeft(trialEndsAt) : 0;

  const modules = Object.values(MODULES).map((module) => ({
    ...module,
    enabled: enabledModules.includes(module.key),
  }));

  return {
    modules,
    inTrial,
    trialDaysLeft,
    isLoading,
  };
}

export default useModule;
