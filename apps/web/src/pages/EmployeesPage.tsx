import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { employeeService } from "../services/employeeService";
import type { Employee } from "../types/employee";
import AddEmployeeModal from "../components/employees/AddEmployeeModal";
import EditEmployeeModal from "../components/employees/EditEmployeeModal";
import DeleteConfirmDialog from "../components/employees/DeleteConfirmDialog";
import { useAuthorization } from "../hooks/useAuthorization";
import "./EmployeesPage.css";

export default function EmployeesPage() {
  const { t } = useTranslation();
  const { canManageEmployees, isEmployee } = useAuthorization();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
      setError(err.response?.data?.message || "Error al cargar empleados");
    } finally {
      setLoading(false);
    }
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      indefinido: "Indefinido",
      temporal: "Temporal",
      practicas: "Prácticas",
      formacion: "Formación",
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: "Activo",
      on_leave: "De Baja",
      terminated: "Terminado",
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
        )}
      </div>

      {employees.length === 0 ? (
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
          <h2>{t("employees.empty.title")}</h2>
          <p>{t("employees.empty.description")}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="employees-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Puesto</th>
                <th>Tipo de Contrato</th>
                <th>Fecha de Ingreso</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="employee-name">
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
                    {canManageEmployees() ? (
                      <div className="action-buttons">
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
                      </div>
                    ) : (
                      <span className="text-muted">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
        }}
        onSuccess={() => {
          setIsDeleteDialogOpen(false);
          setSelectedEmployee(null);
          loadEmployees();
        }}
      />
    </div>
  );
}
