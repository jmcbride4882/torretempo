import { useTranslation } from "react-i18next";
import type { Employee } from "../../types/employee";
import "./EmployeeOverviewTab.css";

interface EmployeeOverviewTabProps {
  employee: Employee;
}

export default function EmployeeOverviewTab({
  employee,
}: EmployeeOverviewTabProps) {
  const { t } = useTranslation();

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      indefinido: t("employee.contractIndefinido"),
      temporal: t("employee.contractTemporal"),
      practicas: t("employee.contractPracticas"),
      formacion: t("employee.contractFormacion"),
    };
    return labels[type] || type;
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      PLATFORM_ADMIN: "Platform Admin",
      OWNER: "Owner",
      ADMIN: t("employee.roleAdmin"),
      MANAGER: t("employee.roleManager"),
      EMPLOYEE: t("employee.roleEmployee"),
    };
    return labels[role] || role;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="overview-tab">
      {/* User Information */}
      <section className="info-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="7" r="4" />
            <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
          </svg>
          <h3>{t("employee.userInfo")}</h3>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <label>{t("auth.email")}</label>
            <span>{employee.user.email}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.firstName")}</label>
            <span>{employee.user.firstName}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.lastName")}</label>
            <span>{employee.user.lastName}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.accessLevel")}</label>
            <span className="role-badge">
              {getRoleLabel(employee.user.role)}
            </span>
          </div>
        </div>
      </section>

      {/* Personal Information */}
      <section className="info-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3>{t("employee.personalInfo")}</h3>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <label>{t("employee.nationalId")}</label>
            <span className="sensitive-data">{employee.nationalId}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.socialSecurity")}</label>
            <span className="sensitive-data">{employee.socialSecurity}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.phone")}</label>
            <span>{employee.phone || "-"}</span>
          </div>
          <div className="info-card full-width">
            <label>{t("employee.emergencyContact")}</label>
            <span>{employee.emergencyContact || "-"}</span>
          </div>
        </div>
      </section>

      {/* Employment Information */}
      <section className="info-section">
        <div className="section-header">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          <h3>{t("employee.employmentInfo")}</h3>
        </div>
        <div className="info-grid">
          <div className="info-card">
            <label>{t("employee.employeeNumber")}</label>
            <span>{employee.employeeNumber || "-"}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.position")}</label>
            <span>{employee.position || "-"}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.contractType")}</label>
            <span className="contract-badge">
              {getContractTypeLabel(employee.contractType)}
            </span>
          </div>
          <div className="info-card">
            <label>{t("employee.workSchedule")}</label>
            <span>{employee.workSchedule || "-"}</span>
          </div>
          <div className="info-card">
            <label>{t("employee.hireDate")}</label>
            <span>{formatDate(employee.hireDate)}</span>
          </div>
          {employee.terminationDate && (
            <div className="info-card">
              <label>{t("employees.profile.terminationDate")}</label>
              <span className="terminated-date">
                {formatDate(employee.terminationDate)}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Metadata */}
      <section className="info-section metadata-section">
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
          <h3>{t("employees.profile.metadata")}</h3>
        </div>
        <div className="info-grid metadata-grid">
          <div className="info-card">
            <label>{t("employees.profile.createdAt")}</label>
            <span className="metadata-value">
              {formatDate(employee.createdAt)}
            </span>
          </div>
          <div className="info-card">
            <label>{t("employees.profile.updatedAt")}</label>
            <span className="metadata-value">
              {formatDate(employee.updatedAt)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
