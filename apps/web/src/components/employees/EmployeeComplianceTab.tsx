import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Employee } from "../../types/employee";
import "./EmployeeComplianceTab.css";

interface EmployeeComplianceTabProps {
  employee: Employee;
}

interface ComplianceData {
  weeklyHours: {
    week: string;
    regularHours: number;
    overtimeHours: number;
    maxAllowed: number;
  }[];
  restPeriods: {
    date: string;
    restHours: number;
    compliant: boolean;
  }[];
  annualLeave: {
    entitled: number;
    used: number;
    remaining: number;
  };
  breakCompliance: {
    date: string;
    requiredBreak: number;
    actualBreak: number;
    compliant: boolean;
  }[];
}

// Mock data - will be replaced with API call
const MOCK_COMPLIANCE: ComplianceData = {
  weeklyHours: [
    { week: "2026-W05", regularHours: 38, overtimeHours: 2, maxAllowed: 40 },
    { week: "2026-W04", regularHours: 40, overtimeHours: 0, maxAllowed: 40 },
    { week: "2026-W03", regularHours: 36, overtimeHours: 0, maxAllowed: 40 },
    { week: "2026-W02", regularHours: 42, overtimeHours: 4, maxAllowed: 40 },
  ],
  restPeriods: [
    { date: "2026-02-03", restHours: 12, compliant: true },
    { date: "2026-02-02", restHours: 11, compliant: true },
    { date: "2026-02-01", restHours: 10, compliant: false },
    { date: "2026-01-31", restHours: 14, compliant: true },
  ],
  annualLeave: {
    entitled: 22,
    used: 5,
    remaining: 17,
  },
  breakCompliance: [
    { date: "2026-02-03", requiredBreak: 30, actualBreak: 35, compliant: true },
    { date: "2026-02-02", requiredBreak: 30, actualBreak: 30, compliant: true },
    {
      date: "2026-02-01",
      requiredBreak: 30,
      actualBreak: 25,
      compliant: false,
    },
  ],
};

export default function EmployeeComplianceTab({
  employee,
}: EmployeeComplianceTabProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplianceData();
  }, [employee.id]);

  const loadComplianceData = async () => {
    // TODO: Replace with actual API call
    setLoading(true);
    setTimeout(() => {
      setData(MOCK_COMPLIANCE);
      setLoading(false);
    }, 500);
  };

  const formatWeek = (weekStr: string) => {
    const [year, week] = weekStr.split("-W");
    return `${t("schedule.weekOf")} ${week}, ${year}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  };

  const getComplianceStatus = (compliant: boolean) => {
    return compliant ? (
      <span className="status-compliant">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {t("employees.profile.compliant")}
      </span>
    ) : (
      <span className="status-non-compliant">
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
        {t("employees.profile.nonCompliant")}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="compliance-tab">
        <div className="loading-compliance">
          <div className="loading-spinner" />
          <p>{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="compliance-tab">
        <div className="empty-compliance">
          <p>{t("messages.noDataAvailable")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="compliance-tab">
      {/* RDL 8/2019 Notice */}
      <div className="compliance-notice">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 12 15 16 10" />
        </svg>
        <div>
          <h4>{t("employees.profile.rdlCompliance")}</h4>
          <p>{t("employees.profile.rdlDescription")}</p>
        </div>
      </div>

      {/* Weekly Hours */}
      <section className="compliance-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3>{t("employees.profile.weeklyHours")}</h3>
        </div>
        <div className="hours-cards">
          {data.weeklyHours.map((week, index) => (
            <div
              key={week.week}
              className={`hours-card ${index === 0 ? "current" : ""}`}
            >
              <div className="hours-header">
                <span className="week-label">{formatWeek(week.week)}</span>
                {week.overtimeHours > 0 && (
                  <span className="overtime-badge">
                    +{week.overtimeHours}h OT
                  </span>
                )}
              </div>
              <div className="hours-bar">
                <div
                  className="hours-fill regular"
                  style={{
                    width: `${(week.regularHours / week.maxAllowed) * 100}%`,
                  }}
                />
                {week.overtimeHours > 0 && (
                  <div
                    className="hours-fill overtime"
                    style={{
                      width: `${(week.overtimeHours / week.maxAllowed) * 100}%`,
                    }}
                  />
                )}
              </div>
              <div className="hours-values">
                <span>
                  {week.regularHours + week.overtimeHours}h / {week.maxAllowed}h
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Annual Leave */}
      <section className="compliance-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
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
          <h3>{t("employees.profile.annualLeave")}</h3>
        </div>
        <div className="leave-summary">
          <div className="leave-card entitled">
            <span className="leave-value">{data.annualLeave.entitled}</span>
            <span className="leave-label">
              {t("employees.profile.entitled")}
            </span>
          </div>
          <div className="leave-card used">
            <span className="leave-value">{data.annualLeave.used}</span>
            <span className="leave-label">{t("employees.profile.used")}</span>
          </div>
          <div className="leave-card remaining">
            <span className="leave-value">{data.annualLeave.remaining}</span>
            <span className="leave-label">
              {t("employees.profile.remaining")}
            </span>
          </div>
        </div>
      </section>

      {/* Rest Periods (11h minimum) */}
      <section className="compliance-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 18a5 5 0 0 0-10 0" />
            <line x1="12" y1="2" x2="12" y2="9" />
            <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
            <line x1="1" y1="18" x2="3" y2="18" />
            <line x1="21" y1="18" x2="23" y2="18" />
            <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
            <line x1="23" y1="22" x2="1" y2="22" />
          </svg>
          <h3>{t("employees.profile.restPeriods")}</h3>
          <span className="section-info">
            {t("employees.profile.minRestHours")}
          </span>
        </div>
        <div className="rest-table">
          {data.restPeriods.map((rest) => (
            <div key={rest.date} className="rest-row">
              <span className="rest-date">{formatDate(rest.date)}</span>
              <span className="rest-hours">{rest.restHours}h</span>
              {getComplianceStatus(rest.compliant)}
            </div>
          ))}
        </div>
      </section>

      {/* Break Compliance */}
      <section className="compliance-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          <h3>{t("employees.profile.breakCompliance")}</h3>
        </div>
        <div className="break-table">
          {data.breakCompliance.map((brk) => (
            <div key={brk.date} className="break-row">
              <span className="break-date">{formatDate(brk.date)}</span>
              <span className="break-required">
                {brk.requiredBreak}m {t("employees.profile.required")}
              </span>
              <span className="break-actual">
                {brk.actualBreak}m {t("employees.profile.actual")}
              </span>
              {getComplianceStatus(brk.compliant)}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
