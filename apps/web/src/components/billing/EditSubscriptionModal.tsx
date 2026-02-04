import { useState, useEffect } from "react";
import type {
  Subscription,
  SubscriptionStatus,
  UpdateSubscriptionPayload,
} from "../../types/billing";
import "./EditSubscriptionModal.css";

interface EditSubscriptionModalProps {
  isOpen: boolean;
  subscription: Subscription | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: string;
  maxEmployees: string;
}

export default function EditSubscriptionModal({
  isOpen,
  subscription,
  onClose,
  onSuccess,
}: EditSubscriptionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitialFormData = (): FormData => {
    if (subscription) {
      return {
        subscriptionStatus: subscription.subscriptionStatus,
        subscriptionTier: subscription.subscriptionTier || "starter",
        maxEmployees: subscription.maxEmployees?.toString() || "",
      };
    }
    return {
      subscriptionStatus: "trial",
      subscriptionTier: "starter",
      maxEmployees: "",
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData());

  useEffect(() => {
    if (isOpen && subscription) {
      setFormData(getInitialFormData());
      setError(null);
    }
  }, [isOpen, subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;

    setLoading(true);
    setError(null);

    try {
      const payload: UpdateSubscriptionPayload = {
        subscriptionStatus: formData.subscriptionStatus,
        subscriptionPlan: formData.subscriptionTier,
      };

      if (formData.maxEmployees) {
        payload.maxEmployees = parseInt(formData.maxEmployees, 10);
      }

      const response = await fetch(
        `/api/v1/platform/billing/subscriptions/${subscription.tenantId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      onSuccess();
      handleClose();
    } catch (err: unknown) {
      console.error("Failed to update subscription:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Error updating subscription";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setError(null);
    onClose();
  };

  const getStatusBadgeClass = (status: SubscriptionStatus): string => {
    const classes: Record<SubscriptionStatus, string> = {
      trial: "status-trial",
      active: "status-active",
      suspended: "status-suspended",
      cancelled: "status-cancelled",
    };
    return classes[status] || "";
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
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!isOpen || !subscription) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content subscription-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-info">
            <h2>Edit Subscription</h2>
            <div className="tenant-badge">
              <span className="tenant-slug">/{subscription.tenantSlug}</span>
              <span
                className={`status-badge ${getStatusBadgeClass(subscription.subscriptionStatus)}`}
              >
                {subscription.subscriptionStatus}
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-alert">{error}</div>}

            {/* Tenant Information (Read-only) */}
            <div className="form-section">
              <h3>Tenant Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Tenant Name</span>
                  <span className="info-value">{subscription.tenantName}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Owner Email</span>
                  <span className="info-value">{subscription.ownerEmail}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Employees</span>
                  <span className="info-value">
                    {subscription.employeeCount}
                    {subscription.maxEmployees &&
                      ` / ${subscription.maxEmployees}`}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Current MRR</span>
                  <span className="info-value mrr-value">
                    {formatCurrency(subscription.mrr)}
                  </span>
                </div>
              </div>
            </div>

            {/* Current Period (Read-only) */}
            <div className="form-section">
              <h3>Current Period</h3>
              <div className="period-info">
                <div className="period-dates">
                  <span className="period-date">
                    <svg
                      width="16"
                      height="16"
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
                    {formatDate(subscription.currentPeriodStart)}
                  </span>
                  <span className="period-separator">
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
                  </span>
                  <span className="period-date">
                    <svg
                      width="16"
                      height="16"
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
                    {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </div>
                {subscription.trialEndsAt && (
                  <div className="trial-warning">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Trial ends: {formatDate(subscription.trialEndsAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Subscription Settings (Editable) */}
            <div className="form-section">
              <h3>Subscription Settings</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="subscriptionStatus">
                    Status <span className="required">*</span>
                  </label>
                  <select
                    id="subscriptionStatus"
                    value={formData.subscriptionStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subscriptionStatus: e.target
                          .value as SubscriptionStatus,
                      })
                    }
                    required
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="subscriptionTier">
                    Subscription Tier <span className="required">*</span>
                  </label>
                  <select
                    id="subscriptionTier"
                    value={formData.subscriptionTier}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subscriptionTier: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="maxEmployees">Max Employees</label>
                <input
                  type="number"
                  id="maxEmployees"
                  value={formData.maxEmployees}
                  onChange={(e) =>
                    setFormData({ ...formData, maxEmployees: e.target.value })
                  }
                  placeholder="Unlimited"
                  min="1"
                />
                <small className="field-hint">
                  Leave empty for unlimited employees. Current:{" "}
                  {subscription.employeeCount}
                </small>
              </div>
            </div>

            {/* Status Change Warning */}
            {formData.subscriptionStatus !==
              subscription.subscriptionStatus && (
              <div className="status-change-warning">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <strong>Status Change Alert</strong>
                  <p>
                    You are changing the status from{" "}
                    <span
                      className={`status-badge small ${getStatusBadgeClass(subscription.subscriptionStatus)}`}
                    >
                      {subscription.subscriptionStatus}
                    </span>{" "}
                    to{" "}
                    <span
                      className={`status-badge small ${getStatusBadgeClass(formData.subscriptionStatus)}`}
                    >
                      {formData.subscriptionStatus}
                    </span>
                  </p>
                  {formData.subscriptionStatus === "suspended" && (
                    <p className="warning-detail">
                      Suspending will disable tenant access until reactivated.
                    </p>
                  )}
                  {formData.subscriptionStatus === "cancelled" && (
                    <p className="warning-detail">
                      Cancelling will permanently disable tenant access.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
