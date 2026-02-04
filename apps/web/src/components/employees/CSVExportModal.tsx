import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useModule } from "../../hooks/useModule";
import type { Employee } from "../../types/employee";
import "./CSVExportModal.css";

interface CSVExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedIds?: string[];
}

interface ExportColumn {
  key: string;
  label: string;
  getter: (e: Employee) => string;
  default: boolean;
}

export default function CSVExportModal({
  isOpen,
  onClose,
  employees,
  selectedIds,
}: CSVExportModalProps) {
  const { t } = useTranslation();
  const { enabled: hasWhiteLabel } = useModule("white_label");

  const EXPORT_COLUMNS: ExportColumn[] = [
    {
      key: "firstName",
      label: t("employee.firstName"),
      getter: (e) => e.user.firstName,
      default: true,
    },
    {
      key: "lastName",
      label: t("employee.lastName"),
      getter: (e) => e.user.lastName,
      default: true,
    },
    {
      key: "email",
      label: t("auth.email"),
      getter: (e) => e.user.email,
      default: true,
    },
    {
      key: "nationalId",
      label: t("employee.nationalId"),
      getter: (e) => e.nationalId,
      default: true,
    },
    {
      key: "socialSecurity",
      label: t("employee.socialSecurity"),
      getter: (e) => e.socialSecurity,
      default: true,
    },
    {
      key: "phone",
      label: t("employee.phone"),
      getter: (e) => e.phone || "",
      default: false,
    },
    {
      key: "employeeNumber",
      label: t("employee.employeeNumber"),
      getter: (e) => e.employeeNumber || "",
      default: false,
    },
    {
      key: "position",
      label: t("employee.position"),
      getter: (e) => e.position || "",
      default: true,
    },
    {
      key: "contractType",
      label: t("employee.contractType"),
      getter: (e) => e.contractType,
      default: true,
    },
    {
      key: "hireDate",
      label: t("employee.hireDate"),
      getter: (e) => new Date(e.hireDate).toISOString().split("T")[0],
      default: true,
    },
    {
      key: "terminationDate",
      label: t("employees.profile.terminationDate"),
      getter: (e) =>
        e.terminationDate
          ? new Date(e.terminationDate).toISOString().split("T")[0]
          : "",
      default: false,
    },
    {
      key: "status",
      label: t("employee.status"),
      getter: (e) => e.status,
      default: true,
    },
    {
      key: "workSchedule",
      label: t("employee.workSchedule"),
      getter: (e) => e.workSchedule || "",
      default: false,
    },
    {
      key: "role",
      label: t("employee.accessLevel"),
      getter: (e) => e.user.role,
      default: false,
    },
  ];

  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.key),
  );
  const [exportAll, setExportAll] = useState(
    !selectedIds || selectedIds.length === 0,
  );
  const [exporting, setExporting] = useState(false);

  const toggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const selectAllColumns = () => {
    setSelectedColumns(EXPORT_COLUMNS.map((c) => c.key));
  };

  const selectDefaultColumns = () => {
    setSelectedColumns(
      EXPORT_COLUMNS.filter((c) => c.default).map((c) => c.key),
    );
  };

  const handleExport = () => {
    setExporting(true);

    const employeesToExport = exportAll
      ? employees
      : employees.filter((e) => selectedIds?.includes(e.id));

    const activeColumns = EXPORT_COLUMNS.filter((c) =>
      selectedColumns.includes(c.key),
    );

    // Build CSV content
    const headers = activeColumns.map((c) => `"${c.label}"`).join(",");
    const rows = employeesToExport.map((employee) =>
      activeColumns
        .map((col) => {
          const value = col.getter(employee);
          // Escape quotes and wrap in quotes
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    );

    const csvContent = [headers, ...rows].join("\n");

    // Download file
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `employees_export_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    onClose();
  };

  if (!isOpen) return null;

  const exportCount = exportAll ? employees.length : selectedIds?.length || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content export-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t("employees.export.title")}</h2>
          <button className="modal-close" onClick={onClose}>
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

        <div className="modal-body">
          {/* Export scope */}
          <div className="export-section">
            <h3>{t("employees.export.scope")}</h3>
            <div className="scope-options">
              <label className={`scope-option ${exportAll ? "active" : ""}`}>
                <input
                  type="radio"
                  checked={exportAll}
                  onChange={() => setExportAll(true)}
                />
                <div className="scope-content">
                  <span className="scope-title">
                    {t("employees.export.allEmployees")}
                  </span>
                  <span className="scope-count">
                    {employees.length} {t("employees.export.employees")}
                  </span>
                </div>
              </label>
              {selectedIds && selectedIds.length > 0 && (
                <label className={`scope-option ${!exportAll ? "active" : ""}`}>
                  <input
                    type="radio"
                    checked={!exportAll}
                    onChange={() => setExportAll(false)}
                  />
                  <div className="scope-content">
                    <span className="scope-title">
                      {t("employees.export.selectedOnly")}
                    </span>
                    <span className="scope-count">
                      {selectedIds.length} {t("employees.export.selected")}
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Column selection */}
          <div className="export-section">
            <div className="section-header">
              <h3>{t("employees.export.selectColumns")}</h3>
              <div className="column-actions">
                <button className="btn-text" onClick={selectAllColumns}>
                  {t("employees.export.selectAll")}
                </button>
                <button className="btn-text" onClick={selectDefaultColumns}>
                  {t("employees.export.selectDefault")}
                </button>
              </div>
            </div>
            <div className="columns-grid">
              {EXPORT_COLUMNS.map((column) => (
                <label key={column.key} className="column-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                  <span className="checkbox-mark">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span className="column-label">{column.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom fields notice */}
          {!hasWhiteLabel && (
            <div className="custom-fields-notice">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                <p>{t("employees.export.customFieldsLocked")}</p>
                <a href="#upgrade">{t("employees.export.upgradeToExport")}</a>
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="export-preview">
            <h4>{t("employees.export.preview")}</h4>
            <div className="preview-content">
              <code>
                {selectedColumns.slice(0, 5).join(", ")}
                {selectedColumns.length > 5 &&
                  `, +${selectedColumns.length - 5}`}
              </code>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary"
            onClick={handleExport}
            disabled={
              exporting || selectedColumns.length === 0 || exportCount === 0
            }
          >
            {exporting ? (
              <>
                <span className="btn-spinner" />
                {t("common.loading")}
              </>
            ) : (
              <>
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
                {t("employees.export.downloadCSV")} ({exportCount})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
