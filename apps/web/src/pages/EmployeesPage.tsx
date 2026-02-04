import { useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { employeeService } from "../services/employeeService";
import { useTenant } from "../contexts/TenantContext";
import { useAuthorization } from "../hooks/useAuthorization";
import { useModule } from "../hooks/useModule";
import type { Employee } from "../types/employee";
import "./EmployeesPage.css";

// Lazy load modals
const AddEmployeeModal = lazy(
  () => import("../components/employees/AddEmployeeModal"),
);
const EditEmployeeModal = lazy(
  () => import("../components/employees/EditEmployeeModal"),
);
const DeleteConfirmDialog = lazy(
  () => import("../components/employees/DeleteConfirmDialog"),
);
const CSVImportModal = lazy(
  () => import("../components/employees/CSVImportModal"),
);
const CSVExportModal = lazy(
  () => import("../components/employees/CSVExportModal"),
);
const CustomFieldsStudioModal = lazy(
  () => import("../components/employees/CustomFieldsStudioModal"),
);
const EmailPreviewModal = lazy(
  () => import("../components/employees/EmailPreviewModal"),
);

type FilterStatus = "all" | "active" | "on_leave" | "terminated";
type FilterContract =
  | "all"
  | "indefinido"
  | "temporal"
  | "practicas"
  | "formacion";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { canManageEmployees, isEmployee } = useAuthorization();
  const { enabled: hasWhiteLabel } = useModule("white_label");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
  const [isEmailPreviewModalOpen, setIsEmailPreviewModalOpen] = useState(false);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterContract, setFilterContract] = useState<FilterContract>("all");

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (err: any) {
      console.error("Failed to load employees:", err);
      setError(err.response?.data?.message || t("messages.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  // Filtered employees based on search and filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const fullName =
          `${emp.user.firstName} ${emp.user.lastName}`.toLowerCase();
        const email = emp.user.email.toLowerCase();
        const empNumber = emp.employeeNumber?.toLowerCase() || "";

        if (
          !fullName.includes(query) &&
          !email.includes(query) &&
          !empNumber.includes(query)
        ) {
          return false;
        }
      }

      // Status filter
      if (filterStatus !== "all" && emp.status !== filterStatus) {
        return false;
      }

      // Contract type filter
      if (filterContract !== "all" && emp.contractType !== filterContract) {
        return false;
      }

      return true;
    });
  }, [employees, searchQuery, filterStatus, filterContract]);

  const handleSelectAll = () => {
    if (selectedIds.length === filteredEmployees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEmployees.map((e) => e.id));
    }
  };

  const handleSelectEmployee = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleViewProfile = (employee: Employee) => {
    const basePath = tenant?.slug ? `/t/${tenant.slug}` : "";
    navigate(`${basePath}/employees/${employee.id}`);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 1) {
      const emp = employees.find((e) => e.id === selectedIds[0]);
      if (emp) {
        setSelectedEmployee(emp);
        setIsDeleteDialogOpen(true);
      }
    }
    // Multi-delete could be implemented here
  };

  const handleBulkExport = () => {
    setIsExportModalOpen(true);
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      indefinido: t("employee.contractIndefinido"),
      temporal: t("employee.contractTemporal"),
      practicas: t("employee.contractPracticas"),
      formacion: t("employee.contractFormacion"),
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: t("employee.active"),
      on_leave: t("employee.onLeave"),
      terminated: t("employee.terminated"),
    };
    return labels[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      active: "status-active",
      on_leave: "status-leave",
      terminated: "status-terminated",
    };
    return classes[status] || "";
  };

  const pageTitle = isEmployee() ? t("user.profile") : t("nav.employees");
  const hasActiveFilters =
    searchQuery || filterStatus !== "all" || filterContract !== "all";

  if (loading) {
    return (
      <div className="employees-page">
        <div className="employees-header">
          <h1>{pageTitle}</h1>
        </div>
        <div className="loading">{t("common.loading")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="employees-page">
        <div className="employees-header">
          <h1>{pageTitle}</h1>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="employees-page">
      <div className="employees-header">
        <h1>{pageTitle}</h1>
        {canManageEmployees() && (
          <div className="header-actions">
            <button
              className="btn-secondary"
              onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
              title={t("common.actions")}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            <button
              className="btn-primary"
              onClick={() => setIsAddModalOpen(true)}
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
              {t("employees.add")}
            </button>
          </div>
        )}
      </div>

      {/* Tools Toolbar (collapsed by default) */}
      {canManageEmployees() && isToolbarExpanded && (
        <div className="tools-toolbar">
          <button
            className="tool-btn"
            onClick={() => setIsImportModalOpen(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {t("common.import")}
          </button>
          <button
            className="tool-btn"
            onClick={() => setIsExportModalOpen(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {t("common.export")}
          </button>
          <button
            className="tool-btn"
            onClick={() => setIsCustomFieldsModalOpen(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t("employees.customFields.title")}
            {!hasWhiteLabel && (
              <span className="tool-badge">{t("billing.tier")}</span>
            )}
          </button>
          <button
            className="tool-btn"
            onClick={() => setIsEmailPreviewModalOpen(true)}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            {t("employees.emailPreview.title")}
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="filters-toolbar">
        <div className="search-box">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder={t("employee.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery("")}>
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
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="filter-select"
          >
            <option value="all">{t("employees.filter.allStatus")}</option>
            <option value="active">{t("employee.active")}</option>
            <option value="on_leave">{t("employee.onLeave")}</option>
            <option value="terminated">{t("employee.terminated")}</option>
          </select>

          <select
            value={filterContract}
            onChange={(e) =>
              setFilterContract(e.target.value as FilterContract)
            }
            className="filter-select"
          >
            <option value="all">{t("employees.filter.allContracts")}</option>
            <option value="indefinido">
              {t("employee.contractIndefinido")}
            </option>
            <option value="temporal">{t("employee.contractTemporal")}</option>
            <option value="practicas">{t("employee.contractPracticas")}</option>
            <option value="formacion">{t("employee.contractFormacion")}</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            className="clear-filters"
            onClick={() => {
              setSearchQuery("");
              setFilterStatus("all");
              setFilterContract("all");
            }}
          >
            {t("employees.clearFilters")}
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="bulk-actions-bar">
          <div className="selection-info">
            <span>
              {t("employees.selected", { count: selectedIds.length })}
            </span>
            <button className="btn-link" onClick={() => setSelectedIds([])}>
              {t("employees.clearSelection")}
            </button>
          </div>
          <div className="bulk-buttons">
            <button className="bulk-btn" onClick={handleBulkExport}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              {t("employees.exportSelected")}
            </button>
            {selectedIds.length === 1 && (
              <button className="bulk-btn danger" onClick={handleBulkDelete}>
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
                {t("common.delete")}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Results Summary */}
      {(hasActiveFilters || employees.length > 0) && (
        <div className="results-summary">
          {t("employees.showing", {
            count: filteredEmployees.length,
            total: employees.length,
          })}
        </div>
      )}

      {filteredEmployees.length === 0 ? (
        <div className="empty-state">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h2>
            {hasActiveFilters
              ? t("employees.noResults")
              : t("employees.empty.title")}
          </h2>
          <p>
            {hasActiveFilters
              ? t("employees.tryDifferentFilters")
              : t("employees.empty.description")}
          </p>
        </div>
      ) : (
        <div className="table-container">
          <table className="employees-table">
            <thead>
              <tr>
                {canManageEmployees() && (
                  <th className="checkbox-cell">
                    <input
                      type="checkbox"
                      checked={
                        selectedIds.length === filteredEmployees.length &&
                        filteredEmployees.length > 0
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th>
                  {t("employee.firstName")} / {t("employee.lastName")}
                </th>
                <th>{t("auth.email")}</th>
                <th>{t("employee.position")}</th>
                <th>{t("employee.contractType")}</th>
                <th>{t("employee.hireDate")}</th>
                <th>{t("employee.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className={
                    selectedIds.includes(employee.id) ? "selected" : ""
                  }
                >
                  {canManageEmployees() && (
                    <td className="checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(employee.id)}
                        onChange={() => handleSelectEmployee(employee.id)}
                      />
                    </td>
                  )}
                  <td>
                    <div
                      className="employee-name clickable"
                      onClick={() => handleViewProfile(employee)}
                    >
                      <div className="avatar">
                        {employee.user.firstName.charAt(0)}
                        {employee.user.lastName.charAt(0)}
                      </div>
                      <div>
                        <div className="name">
                          {employee.user.firstName} {employee.user.lastName}
                        </div>
                        {employee.employeeNumber && (
                          <div className="employee-number">
                            #{employee.employeeNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{employee.user.email}</td>
                  <td>{employee.position || "-"}</td>
                  <td>{getContractTypeLabel(employee.contractType)}</td>
                  <td>
                    {new Date(employee.hireDate).toLocaleDateString("es-ES")}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${getStatusClass(employee.status)}`}
                    >
                      {getStatusLabel(employee.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon"
                        title={t("employees.viewProfile")}
                        onClick={() => handleViewProfile(employee)}
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
                      {canManageEmployees() && (
                        <>
                          <button
                            className="btn-icon"
                            title={t("common.edit")}
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsEditModalOpen(true);
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
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className="btn-icon btn-danger"
                            title={t("common.delete")}
                            onClick={() => {
                              setSelectedEmployee(employee);
                              setIsDeleteDialogOpen(true);
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Suspense fallback={null}>
        <AddEmployeeModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadEmployees();
          }}
        />

        <EditEmployeeModal
          isOpen={isEditModalOpen}
          employee={selectedEmployee}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedEmployee(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedEmployee(null);
            loadEmployees();
          }}
        />

        <DeleteConfirmDialog
          isOpen={isDeleteDialogOpen}
          employee={selectedEmployee}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setSelectedEmployee(null);
            setSelectedIds([]);
          }}
          onSuccess={() => {
            setIsDeleteDialogOpen(false);
            setSelectedEmployee(null);
            setSelectedIds([]);
            loadEmployees();
          }}
        />

        <CSVImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            setIsImportModalOpen(false);
            loadEmployees();
          }}
        />

        <CSVExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          employees={employees}
          selectedIds={selectedIds.length > 0 ? selectedIds : undefined}
        />

        <CustomFieldsStudioModal
          isOpen={isCustomFieldsModalOpen}
          onClose={() => setIsCustomFieldsModalOpen(false)}
          onSave={(fields) => {
            console.log("Custom fields saved:", fields);
            // TODO: Save to backend
          }}
        />

        <EmailPreviewModal
          isOpen={isEmailPreviewModalOpen}
          onClose={() => setIsEmailPreviewModalOpen(false)}
          employeeName={selectedEmployee?.user.firstName || "Juan Garcia"}
          employeeEmail={selectedEmployee?.user.email || "juan@example.com"}
        />
      </Suspense>
    </div>
  );
}
