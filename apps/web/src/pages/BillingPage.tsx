import { useState, useEffect, lazy, Suspense } from "react";
import { useAuthStore } from "../stores/authStore";
import { apiClient } from "../services/api";
import type {
  Subscription,
  RevenueMetrics,
  ApiSubscription,
  SubscriptionStatus,
} from "../types/billing";
import "./BillingPage.css";

// Lazy load the edit modal
const EditSubscriptionModal = lazy(
  () => import("../components/billing/EditSubscriptionModal"),
);

/**
 * Platform Billing Portal
 *
 * SECURITY: Only accessible to PLATFORM_ADMIN role
 * Manages all tenant subscriptions and displays revenue metrics
 */

// Price per tenant (placeholder - should come from config/database)
const MONTHLY_PRICE = 49;

export default function BillingPage() {
  const { user } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  // SECURITY: Only PLATFORM_ADMIN can access this page
  const isPlatformAdmin = user?.role?.toUpperCase() === "PLATFORM_ADMIN";

  useEffect(() => {
    if (isPlatformAdmin) {
      loadRevenue();
      loadSubscriptions();
    } else {
      setError("Access denied. PLATFORM_ADMIN role required.");
      setLoading(false);
      setMetricsLoading(false);
    }
  }, [isPlatformAdmin]);

  // Reload subscriptions when filters change
  useEffect(() => {
    if (isPlatformAdmin) {
      loadSubscriptions();
    }
  }, [currentPage, statusFilter, searchQuery]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const loadRevenue = async () => {
    try {
      setMetricsLoading(true);

      const response = await apiClient.get("/platform/billing/revenue");
      setMetrics({
        mrr: response.data.data.mrr,
        arr: response.data.data.arr,
        activeTenants: response.data.data.metrics.activeTenants,
        trialTenants: response.data.data.metrics.trialTenants,
        suspendedTenants: response.data.data.metrics.suspendedTenants,
        cancelledTenants: response.data.data.metrics.cancelledTenants,
        totalTenants: response.data.data.metrics.totalTenants,
        totalEmployees: response.data.data.metrics.totalEmployees,
      });
    } catch (err: unknown) {
      console.error("Failed to load revenue metrics:", err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        perPage: itemsPerPage.toString(),
      });

      if (statusFilter !== "all") {
        params.append("subscriptionStatus", statusFilter);
      }

      if (searchQuery) {
        params.append("search", searchQuery);
      }

      const response = await apiClient.get(
        `/platform/billing/subscriptions?${params.toString()}`,
      );

      // Map API response to Subscription interface
      const mappedSubscriptions: Subscription[] = response.data.data.map(
        (tenant: ApiSubscription) => mapApiToSubscription(tenant),
      );

      setSubscriptions(mappedSubscriptions);
      setTotalItems(response.data.meta.total);
      setTotalPages(Math.ceil(response.data.meta.total / itemsPerPage));
    } catch (err: unknown) {
      console.error("Failed to load subscriptions:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error loading subscriptions";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const mapApiToSubscription = (tenant: ApiSubscription): Subscription => {
    // Calculate current period (monthly billing cycle from createdAt)
    const createdDate = new Date(tenant.createdAt);
    const now = new Date();
    const monthsSinceCreation =
      (now.getFullYear() - createdDate.getFullYear()) * 12 +
      (now.getMonth() - createdDate.getMonth());
    const currentPeriodStart = new Date(createdDate);
    currentPeriodStart.setMonth(createdDate.getMonth() + monthsSinceCreation);
    const currentPeriodEnd = new Date(currentPeriodStart);
    currentPeriodEnd.setMonth(currentPeriodStart.getMonth() + 1);

    // Calculate trial end date (30 days from creation if still in trial)
    const trialEndsAt =
      tenant.subscriptionStatus === "trial"
        ? new Date(
            createdDate.getTime() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;

    // Calculate MRR (only for active subscriptions)
    const mrr = tenant.subscriptionStatus === "active" ? MONTHLY_PRICE : 0;

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.legalName,
      ownerEmail: tenant.email,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionTier: tenant.subscriptionPlan || "starter",
      billingCycle: "monthly",
      currentPeriodStart: currentPeriodStart.toISOString(),
      currentPeriodEnd: currentPeriodEnd.toISOString(),
      trialEndsAt,
      employeeCount: tenant._count.employees,
      maxEmployees: tenant.maxEmployees,
      mrr,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusLabel = (status: SubscriptionStatus): string => {
    const labels: Record<SubscriptionStatus, string> = {
      trial: "Trial",
      active: "Active",
      suspended: "Suspended",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: SubscriptionStatus): string => {
    const classes: Record<SubscriptionStatus, string> = {
      trial: "status-trial",
      active: "status-active",
      suspended: "status-suspended",
      cancelled: "status-cancelled",
    };
    return classes[status] || "";
  };

  const getTierLabel = (tier: string): string => {
    const labels: Record<string, string> = {
      starter: "Starter",
      professional: "Professional",
      enterprise: "Enterprise",
    };
    return labels[tier] || tier;
  };

  const handleEditClick = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setSelectedSubscription(null);
  };

  const handleEditSuccess = () => {
    loadSubscriptions();
    loadRevenue();
    handleEditModalClose();
  };

  if (!isPlatformAdmin) {
    return (
      <div className="billing-page">
        <div className="billing-header">
          <h1>Access Denied</h1>
        </div>
        <div className="error-message">
          This page is restricted to PLATFORM_ADMIN users only.
        </div>
      </div>
    );
  }

  return (
    <div className="billing-page">
      <div className="billing-header">
        <div className="header-content">
          <h1>Billing Portal</h1>
          <p className="header-subtitle">
            Manage tenant subscriptions and revenue metrics
          </p>
        </div>
      </div>

      {/* Revenue Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card metric-mrr">
          <div className="metric-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">Monthly Recurring Revenue</span>
            <span className="metric-value">
              {metricsLoading ? (
                <span className="loading-skeleton" />
              ) : (
                formatCurrency(metrics?.mrr || 0)
              )}
            </span>
          </div>
        </div>

        <div className="metric-card metric-arr">
          <div className="metric-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="metric-content">
            <span className="metric-label">Annual Recurring Revenue</span>
            <span className="metric-value">
              {metricsLoading ? (
                <span className="loading-skeleton" />
              ) : (
                formatCurrency(metrics?.arr || 0)
              )}
            </span>
          </div>
        </div>

        <div className="metric-card metric-active">
          <div className="metric-icon">
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
          </div>
          <div className="metric-content">
            <span className="metric-label">Active Tenants</span>
            <span className="metric-value">
              {metricsLoading ? (
                <span className="loading-skeleton" />
              ) : (
                <>
                  {metrics?.activeTenants || 0}
                  <span className="metric-badge badge-active">Paying</span>
                </>
              )}
            </span>
          </div>
        </div>

        <div className="metric-card metric-trial">
          <div className="metric-icon">
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
          <div className="metric-content">
            <span className="metric-label">Trial Tenants</span>
            <span className="metric-value">
              {metricsLoading ? (
                <span className="loading-skeleton" />
              ) : (
                <>
                  {metrics?.trialTenants || 0}
                  <span className="metric-badge badge-trial">Converting</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="billing-controls">
        <div className="search-box">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="search-icon"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by tenant name, slug, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery("")}
              title="Clear search"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="statusFilter" className="filter-label">
            Status:
          </label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {(searchQuery || statusFilter !== "all") && (
          <div className="filter-summary">
            Showing {subscriptions.length} of {totalItems} subscriptions
          </div>
        )}
      </div>

      {/* Subscriptions Table */}
      {loading ? (
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading subscriptions...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <div className="error-message">{error}</div>
          <button className="btn-primary" onClick={loadSubscriptions}>
            Retry
          </button>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="empty-state">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <h2>No Subscriptions Found</h2>
          <p>
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "No tenants have been created yet."}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="subscriptions-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Owner Email</th>
                <th>Status</th>
                <th>Tier</th>
                <th>Cycle</th>
                <th>MRR</th>
                <th>Employees</th>
                <th>Current Period</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((subscription) => (
                <tr key={subscription.tenantId}>
                  <td>
                    <div className="tenant-info">
                      <div className="tenant-avatar">
                        {subscription.tenantName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="tenant-name">
                          {subscription.tenantName}
                        </div>
                        <div className="tenant-slug">
                          /{subscription.tenantSlug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="email-text">
                      {subscription.ownerEmail}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(subscription.subscriptionStatus)}`}
                    >
                      {getStatusLabel(subscription.subscriptionStatus)}
                    </span>
                  </td>
                  <td>
                    <span className="tier-badge">
                      {getTierLabel(subscription.subscriptionTier)}
                    </span>
                  </td>
                  <td>
                    <span className="cycle-text">
                      {subscription.billingCycle === "monthly"
                        ? "Monthly"
                        : "Annual"}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`mrr-text ${subscription.mrr > 0 ? "mrr-positive" : "mrr-zero"}`}
                    >
                      {formatCurrency(subscription.mrr)}
                    </span>
                  </td>
                  <td>
                    <div className="employee-count">
                      {subscription.employeeCount}
                      {subscription.maxEmployees && (
                        <span className="max-employees">
                          {" "}
                          / {subscription.maxEmployees}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="period-text">
                      {formatDate(subscription.currentPeriodStart)} -{" "}
                      {formatDate(subscription.currentPeriodEnd)}
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="Edit Subscription"
                        onClick={() => handleEditClick(subscription)}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
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
                Previous
              </button>

              <div className="pagination-info">
                <span className="pagination-text">
                  Page {currentPage} of {totalPages}
                </span>
                <span className="pagination-subtext">
                  Showing{" "}
                  {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} -{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of{" "}
                  {totalItems}
                </span>
              </div>

              <button
                className="pagination-btn"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <svg
                  width="20"
                  height="20"
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
      )}

      {/* Edit Subscription Modal */}
      <Suspense fallback={null}>
        <EditSubscriptionModal
          isOpen={isEditModalOpen}
          subscription={selectedSubscription}
          onClose={handleEditModalClose}
          onSuccess={handleEditSuccess}
        />
      </Suspense>
    </div>
  );
}
