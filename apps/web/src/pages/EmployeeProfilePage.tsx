import { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { employeeService } from "../services/employeeService";
import { useTenant } from "../contexts/TenantContext";
import type { Employee } from "../types/employee";
import "./EmployeeProfilePage.css";

// Lazy load tab components
const EmployeeOverviewTab = lazy(
  () => import("../components/employees/EmployeeOverviewTab"),
);
const EmployeeTimeEntriesTab = lazy(
  () => import("../components/employees/EmployeeTimeEntriesTab"),
);
const EmployeeScheduleTab = lazy(
  () => import("../components/employees/EmployeeScheduleTab"),
);
const EmployeeComplianceTab = lazy(
  () => import("../components/employees/EmployeeComplianceTab"),
);
const EmployeeAuditTab = lazy(
  () => import("../components/employees/EmployeeAuditTab"),
);

type TabKey = "overview" | "timeEntries" | "schedule" | "compliance" | "audit";

interface Tab {
  key: TabKey;
  labelKey: string;
  icon: JSX.Element;
}

const TABS: Tab[] = [
  {
    key: "overview",
    labelKey: "employees.profile.tabs.overview",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="7" r="4" />
        <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
      </svg>
    ),
  },
  {
    key: "timeEntries",
    labelKey: "employees.profile.tabs.timeEntries",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "schedule",
    labelKey: "employees.profile.tabs.schedule",
    icon: (
      <svg
        width="18"
        height="18"
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
  },
  {
    key: "compliance",
    labelKey: "employees.profile.tabs.compliance",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 12 15 16 10" />
      </svg>
    ),
  },
  {
    key: "audit",
    labelKey: "employees.profile.tabs.audit",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

function TabLoader() {
  return (
    <div className="tab-loader">
      <div className="tab-loader-spinner" />
    </div>
  );
}

export default function EmployeeProfilePage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useTenant();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  useEffect(() => {
    if (id) {
      loadEmployee(id);
    }
  }, [id]);

  const loadEmployee = async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getById(employeeId);
      setEmployee(data);
    } catch (err: any) {
      console.error("Failed to load employee:", err);
      setError(err.response?.data?.message || t("messages.errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    const basePath = tenant?.slug ? `/t/${tenant.slug}` : "";
    navigate(`${basePath}/employees`);
  };

  const getStatusClass = (status: string) => {
    const classes: Record<string, string> = {
      active: "status-active",
      on_leave: "status-leave",
      terminated: "status-terminated",
    };
    return classes[status] || "";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: t("employee.active"),
      on_leave: t("employee.onLeave"),
      terminated: t("employee.terminated"),
    };
    return labels[status] || status;
  };

  const renderTabContent = () => {
    if (!employee) return null;

    switch (activeTab) {
      case "overview":
        return <EmployeeOverviewTab employee={employee} />;
      case "timeEntries":
        return <EmployeeTimeEntriesTab employee={employee} />;
      case "schedule":
        return <EmployeeScheduleTab employee={employee} />;
      case "compliance":
        return <EmployeeComplianceTab employee={employee} />;
      case "audit":
        return <EmployeeAuditTab employee={employee} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="employee-profile-page">
        <div className="profile-header">
          <button className="btn-back" onClick={handleBack}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t("common.back")}
          </button>
        </div>
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="employee-profile-page">
        <div className="profile-header">
          <button className="btn-back" onClick={handleBack}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {t("common.back")}
          </button>
        </div>
        <div className="error-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <h2>{t("messages.errorOccurred")}</h2>
          <p>{error || t("employee.noEmployees")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="employee-profile-page">
      {/* Header with back button and employee info */}
      <div className="profile-header">
        <button className="btn-back" onClick={handleBack}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          {t("common.back")}
        </button>
      </div>

      {/* Employee Hero Card */}
      <div className="profile-hero">
        <div className="hero-avatar">
          {employee.user.firstName.charAt(0)}
          {employee.user.lastName.charAt(0)}
        </div>
        <div className="hero-info">
          <h1 className="hero-name">
            {employee.user.firstName} {employee.user.lastName}
          </h1>
          <div className="hero-meta">
            {employee.position && (
              <span className="meta-position">{employee.position}</span>
            )}
            {employee.employeeNumber && (
              <span className="meta-number">#{employee.employeeNumber}</span>
            )}
            <span className={`status-badge ${getStatusClass(employee.status)}`}>
              {getStatusLabel(employee.status)}
            </span>
          </div>
          <div className="hero-email">{employee.user.email}</div>
        </div>
      </div>

      {/* Tab Navigation - Desktop */}
      <nav className="tabs-nav tabs-desktop">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab-btn ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </nav>

      {/* Tab Navigation - Mobile (Dropdown) */}
      <div className="tabs-mobile">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value as TabKey)}
          className="tabs-select"
        >
          {TABS.map((tab) => (
            <option key={tab.key} value={tab.key}>
              {t(tab.labelKey)}
            </option>
          ))}
        </select>
        <svg
          className="select-arrow"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        <Suspense fallback={<TabLoader />}>{renderTabContent()}</Suspense>
      </div>
    </div>
  );
}
