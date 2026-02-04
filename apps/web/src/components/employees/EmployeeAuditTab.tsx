import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Employee } from "../../types/employee";
import "./EmployeeAuditTab.css";

interface EmployeeAuditTabProps {
  employee: Employee;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: "created" | "updated" | "status_changed" | "role_changed" | "deleted";
  actor: {
    name: string;
    role: string;
  };
  changes: {
    field: string;
    oldValue: string | null;
    newValue: string;
  }[];
  ipAddress?: string;
}

// Mock data - will be replaced with API call
const MOCK_AUDIT: AuditEntry[] = [
  {
    id: "1",
    timestamp: new Date().toISOString(),
    action: "updated",
    actor: { name: "Maria Garcia", role: "ADMIN" },
    changes: [
      {
        field: "position",
        oldValue: "Junior Waiter",
        newValue: "Senior Waiter",
      },
    ],
    ipAddress: "192.168.1.100",
  },
  {
    id: "2",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    action: "status_changed",
    actor: { name: "Carlos Rodriguez", role: "MANAGER" },
    changes: [{ field: "status", oldValue: "on_leave", newValue: "active" }],
    ipAddress: "192.168.1.101",
  },
  {
    id: "3",
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    action: "role_changed",
    actor: { name: "System Admin", role: "PLATFORM_ADMIN" },
    changes: [{ field: "role", oldValue: "EMPLOYEE", newValue: "MANAGER" }],
    ipAddress: "10.0.0.1",
  },
  {
    id: "4",
    timestamp: new Date(Date.now() - 86400000 * 30).toISOString(),
    action: "updated",
    actor: { name: "HR Department", role: "ADMIN" },
    changes: [
      {
        field: "phone",
        oldValue: "+34 600 111 222",
        newValue: "+34 600 333 444",
      },
      {
        field: "emergencyContact",
        oldValue: null,
        newValue: "John: +34 600 555 666",
      },
    ],
    ipAddress: "192.168.1.50",
  },
  {
    id: "5",
    timestamp: new Date(Date.now() - 86400000 * 90).toISOString(),
    action: "created",
    actor: { name: "HR Department", role: "ADMIN" },
    changes: [
      { field: "record", oldValue: null, newValue: "Employee record created" },
    ],
    ipAddress: "192.168.1.50",
  },
];

export default function EmployeeAuditTab({ employee }: EmployeeAuditTabProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadAuditLog();
  }, [employee.id]);

  const loadAuditLog = async () => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setEntries(MOCK_AUDIT);
      setLoading(false);
    }, 500);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (action: AuditEntry["action"]) => {
    switch (action) {
      case "created":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
      case "updated":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        );
      case "status_changed":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
        );
      case "role_changed":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        );
      case "deleted":
        return (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getActionLabel = (action: AuditEntry["action"]) => {
    const labels: Record<string, string> = {
      created: t("employees.profile.audit.created"),
      updated: t("employees.profile.audit.updated"),
      status_changed: t("employees.profile.audit.statusChanged"),
      role_changed: t("employees.profile.audit.roleChanged"),
      deleted: t("employees.profile.audit.deleted"),
    };
    return labels[action] || action;
  };

  const getFieldLabel = (field: string) => {
    const labels: Record<string, string> = {
      position: t("employee.position"),
      status: t("employee.status"),
      role: t("employee.accessLevel"),
      phone: t("employee.phone"),
      emergencyContact: t("employee.emergencyContact"),
      record: t("employees.profile.audit.record"),
      contractType: t("employee.contractType"),
      workSchedule: t("employee.workSchedule"),
    };
    return labels[field] || field;
  };

  const filteredEntries =
    filter === "all"
      ? entries
      : entries.filter((entry) => entry.action === filter);

  if (loading) {
    return (
      <div className="audit-tab">
        <div className="loading-audit">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-tab">
      {/* Header with filter */}
      <div className="audit-header">
        <h3>{t("employees.profile.auditLog")}</h3>
        <select
          className="audit-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">{t("employees.profile.audit.allActions")}</option>
          <option value="created">
            {t("employees.profile.audit.created")}
          </option>
          <option value="updated">
            {t("employees.profile.audit.updated")}
          </option>
          <option value="status_changed">
            {t("employees.profile.audit.statusChanged")}
          </option>
          <option value="role_changed">
            {t("employees.profile.audit.roleChanged")}
          </option>
        </select>
      </div>

      {/* Audit Trail Notice */}
      <div className="audit-notice">
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
        <p>{t("employees.profile.auditNotice")}</p>
      </div>

      {/* Audit Timeline */}
      {filteredEntries.length === 0 ? (
        <div className="empty-audit">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <h3>{t("employees.profile.noAuditEntries")}</h3>
        </div>
      ) : (
        <div className="audit-timeline">
          {filteredEntries.map((entry, index) => (
            <div key={entry.id} className={`audit-entry ${entry.action}`}>
              <div className="entry-connector">
                <div className={`entry-icon ${entry.action}`}>
                  {getActionIcon(entry.action)}
                </div>
                {index < filteredEntries.length - 1 && (
                  <div className="entry-line" />
                )}
              </div>
              <div className="entry-content">
                <div className="entry-header">
                  <span className="entry-action">
                    {getActionLabel(entry.action)}
                  </span>
                  <span className="entry-timestamp">
                    {formatTimestamp(entry.timestamp)}
                  </span>
                </div>
                <div className="entry-actor">
                  <span className="actor-name">{entry.actor.name}</span>
                  <span className="actor-role">{entry.actor.role}</span>
                </div>
                <div className="entry-changes">
                  {entry.changes.map((change, i) => (
                    <div key={i} className="change-item">
                      <span className="change-field">
                        {getFieldLabel(change.field)}:
                      </span>
                      {change.oldValue && (
                        <>
                          <span className="change-old">{change.oldValue}</span>
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                          </svg>
                        </>
                      )}
                      <span className="change-new">{change.newValue}</span>
                    </div>
                  ))}
                </div>
                {entry.ipAddress && (
                  <div className="entry-ip">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span>{entry.ipAddress}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
