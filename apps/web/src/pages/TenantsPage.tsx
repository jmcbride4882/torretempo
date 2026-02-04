import { useState, useEffect } from "react";
import { useAuthStore } from "../stores/authStore";
import { apiClient } from "../services/api";
import TenantModal from "../components/tenants/TenantModal";
import DeleteConfirmModal from "../components/tenants/DeleteConfirmModal";
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

      const response = await apiClient.get("/tenants");
      setTenants(response.data.data || []);
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

  const handleCreateClick = () => {
    setModalMode("create");
    setSelectedTenant(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (tenant: Tenant) => {
    setModalMode("edit");
    setSelectedTenant(tenant);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedTenant(null);
  };

  const handleModalSuccess = () => {
    loadTenants(); // Reload tenant list
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return;

    try {
      await apiClient.delete(`/tenants/${tenantToDelete.id}`);

      // Reload tenant list after successful delete
      loadTenants();
      setIsDeleteModalOpen(false);
      setTenantToDelete(null);
    } catch (err: any) {
      console.error("Failed to delete tenant:", err);
      throw err;
    }
  };

  const handleDeleteModalClose = () => {
    setIsDeleteModalOpen(false);
    setTenantToDelete(null);
  };

  // Filter tenants based on search query and status
  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      searchQuery === "" ||
      tenant.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || tenant.subscriptionStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredTenants.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTenants = filteredTenants.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

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
        <button className="btn-primary" onClick={handleCreateClick}>
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

      {/* Search and Filter Controls */}
      {tenants.length > 0 && (
        <div className="tenants-controls">
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
              placeholder="Search by name, slug, or email..."
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
              Showing {filteredTenants.length} of {tenants.length} tenants
            </div>
          )}
        </div>
      )}

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
      ) : filteredTenants.length === 0 ? (
        <div className="empty-state">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <h2>No Matching Tenants</h2>
          <p>Try adjusting your search or filter criteria.</p>
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
              {paginatedTenants.map((tenant) => (
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
                        onClick={() => handleEditClick(tenant)}
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
                        onClick={() => handleDeleteClick(tenant)}
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
                  Showing {startIndex + 1}-
                  {Math.min(endIndex, filteredTenants.length)} of{" "}
                  {filteredTenants.length}
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

      <TenantModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        mode={modalMode}
        tenant={selectedTenant}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        tenantName={tenantToDelete?.legalName || ""}
      />
    </div>
  );
}
