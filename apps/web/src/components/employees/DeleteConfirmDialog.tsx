import { useState } from "react";
import { employeeService } from "../../services/employeeService";
import type { Employee } from "../../types/employee";
import "./AddEmployeeModal.css";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteConfirmDialog({
  isOpen,
  employee,
  onClose,
  onSuccess,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!employee) return;

    setLoading(true);
    setError(null);

    try {
      await employeeService.delete(employee.id);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Failed to delete employee:", err);
      setError(err.response?.data?.message || "Error al eliminar empleado");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  if (!isOpen || !employee) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content modal-small"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Confirmar Eliminación</h2>
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

        <div className="modal-body">
          {error && <div className="error-alert">{error}</div>}

          <div className="delete-warning">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="warning-text">
              ¿Está seguro de que desea eliminar a{" "}
              <strong>
                {employee.user.firstName} {employee.user.lastName}
              </strong>
              ?
            </p>
            <p className="warning-subtext">
              Esta acción no se puede deshacer. El empleado será marcado como
              eliminado en el sistema.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Eliminando..." : "Eliminar Empleado"}
          </button>
        </div>
      </div>
    </div>
  );
}
