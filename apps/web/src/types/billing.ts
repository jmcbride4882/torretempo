/**
 * Billing Types for Platform Admin Billing Portal
 *
 * SECURITY: Used only in PLATFORM_ADMIN context
 * Manages all tenant subscriptions and revenue metrics
 */

export type SubscriptionStatus = "trial" | "active" | "suspended" | "cancelled";
export type BillingCycle = "monthly" | "annual";
export type SubscriptionTier = "starter" | "professional" | "enterprise";

export interface Subscription {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  ownerEmail: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: string;
  billingCycle: BillingCycle;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  employeeCount: number;
  maxEmployees: number | null;
  mrr: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  activeTenants: number;
  trialTenants: number;
  suspendedTenants: number;
  cancelledTenants: number;
  totalTenants: number;
  totalEmployees: number;
}

export interface SubscriptionListResponse {
  success: boolean;
  data: ApiSubscription[];
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
}

export interface RevenueResponse {
  success: boolean;
  data: {
    mrr: number;
    arr: number;
    metrics: {
      activeTenants: number;
      trialTenants: number;
      suspendedTenants: number;
      cancelledTenants: number;
      totalTenants: number;
      totalEmployees: number;
    };
  };
}

// API response type (matches backend structure)
export interface ApiSubscription {
  id: string;
  slug: string;
  legalName: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionPlan: string | null;
  maxEmployees: number | null;
  createdAt: string;
  updatedAt: string;
  _count: {
    employees: number;
  };
}

export interface UpdateSubscriptionPayload {
  subscriptionStatus?: SubscriptionStatus;
  subscriptionPlan?: string;
  maxEmployees?: number;
}
