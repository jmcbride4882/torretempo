import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import "./TenantsPage.css";

/**
 * Tenant Management Page
 *
 * SECURITY: Only accessible to PLATFORM_ADMIN role
 * Manages all tenants across the platform
 */

interface Tenant {
  id: string;
  slug: string;
  legalName: string;
  email: string;
  phone?: string;
  subscriptionStatus: "trial" | "active" | "suspended" | "cancelled";
  maxEmployees?: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    employees: number;
  };
}

export default function TenantsPage() {
  const { user } = useAuthStore();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SECURITY: Only PLATFORM_ADMIN can access this page
  const isPlatformAdmin = user?.role?.toUpperCase() === "PLATFORM_ADMIN";

  useEffect(() => {
    if (isPlatformAdmin) {
      loadTenants();
    } else {
      setError("Access denied. PLATFORM_ADMIN role required.");
      setLoading(false);
    }
  }, [isPlatformAdmin]);

  const loadTenants = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/v1/platform/tenants", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTenants(result.data || []);
    } catch (err: any) {
      console.error("Failed to load tenants:", err);
      setError(err.message || "Error loading tenants");
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      trial: "Trial",
      active: "Active",
      suspended: "Suspended",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      trial: "status-trial",
      active: "status-active",
      suspended: "status-suspended",
      cancelled: "status-cancelled",
    };
    return classes[status] || "";
  };

  if (!isPlatformAdmin) {
    return (
      <div className="tenants-page">
        <div className="tenants-header">
          <h1>Access Denied</h1>
        </div>
        <div className="error-message">
          This page is restricted to PLATFORM_ADMIN users only.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="tenants-page">
        <div className="tenants-header">
          <h1>Tenant Management</h1>
        </div>
        <div className="loading">Loading tenants...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tenants-page">
        <div className="tenants-header">
          <h1>Tenant Management</h1>
        </div>
        <div className="error-message">{error}</div>
        <button className="btn-primary" onClick={loadTenants}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="tenants-page">
      <div className="tenants-header">
        <h1>Tenant Management</h1>
        <button
          className="btn-primary"
          onClick={() => alert("Create tenant - coming soon")}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Tenant
        </button>
      </div>

      {tenants.length === 0 ? (
        <div className="empty-state">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <h2>No Tenants Found</h2>
          <p>Create your first tenant to get started.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="tenants-table">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Contact</th>
                <th>Employees</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td>
                    <div className="tenant-info">
                      <div className="tenant-avatar">
                        {tenant.legalName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="tenant-name">{tenant.legalName}</div>
                        <div className="tenant-slug">/{tenant.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="contact-info">
                      <div>{tenant.email}</div>
                      {tenant.phone && (
                        <div className="text-muted">{tenant.phone}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="employee-count">
                      {tenant._count?.employees || 0}
                      {tenant.maxEmployees && ` / ${tenant.maxEmployees}`}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(tenant.subscriptionStatus)}`}
                    >
                      {getStatusLabel(tenant.subscriptionStatus)}
                    </span>
                  </td>
                  <td>
                    {new Date(tenant.createdAt).toLocaleDateString("es-ES")}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title="View Details"
                        onClick={() =>
                          alert(`View tenant: ${tenant.legalName}`)
                        }
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      </button>
                      <button
                        className="btn-icon"
                        title="Edit Tenant"
                        onClick={() =>
                          alert(`Edit tenant: ${tenant.legalName}`)
                        }
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
                      <button
                        className="btn-icon btn-danger"
                        title="Delete Tenant"
                        onClick={() => {
                          if (
                            confirm(
                              `Delete tenant "${tenant.legalName}"? This action can be reversed.`,
                            )
                          ) {
                            alert("Delete functionality coming soon");
                          }
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
