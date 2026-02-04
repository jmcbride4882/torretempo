import { useState, useEffect } from "react";
import { employeeService } from "../../services/employeeService";
import type { Employee, UpdateEmployeeInput } from "../../types/employee";
import "./AddEmployeeModal.css";

interface EditEmployeeModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditEmployeeModal({
  isOpen,
  employee,
  onClose,
  onSuccess,
}: EditEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<UpdateEmployeeInput>({
    phone: "",
    emergencyContact: "",
    position: "",
    contractType: "indefinido",
    workSchedule: "",
    status: "active",
  });

  // Pre-fill form when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({
        phone: employee.phone || "",
        emergencyContact: employee.emergencyContact || "",
        position: employee.position || "",
        contractType: employee.contractType,
        workSchedule: employee.workSchedule || "",
        status: employee.status,
      });
      setError(null);
    }
  }, [employee, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employee) return;

    setLoading(true);
    setError(null);

    try {
      await employeeService.update(employee.id, formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error("Failed to update employee:", err);
      setError(err.response?.data?.message || "Error al actualizar empleado");
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Empleado</h2>
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-alert">{error}</div>}

            <div className="form-section">
              <h3>Información del Usuario</h3>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={employee.user.email}
                  disabled
                  className="form-input-disabled"
                />
                <small className="text-muted">
                  No se puede cambiar el email
                </small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={employee.user.firstName}
                    disabled
                    className="form-input-disabled"
                  />
                  <small className="text-muted">
                    No se puede cambiar el nombre
                  </small>
                </div>
                <div className="form-group">
                  <label>Apellidos</label>
                  <input
                    type="text"
                    value={employee.user.lastName}
                    disabled
                    className="form-input-disabled"
                  />
                  <small className="text-muted">
                    No se puede cambiar los apellidos
                  </small>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Información Laboral</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="position">Puesto</label>
                  <input
                    type="text"
                    id="position"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    placeholder="Camarero, Chef, etc."
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="contractType">
                    Tipo de Contrato <span className="required">*</span>
                  </label>
                  <select
                    id="contractType"
                    value={formData.contractType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contractType: e.target.value as any,
                      })
                    }
                    required
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="temporal">Temporal</option>
                    <option value="practicas">Prácticas</option>
                    <option value="formacion">Formación</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="workSchedule">Horario de Trabajo</label>
                <input
                  type="text"
                  id="workSchedule"
                  value={formData.workSchedule}
                  onChange={(e) =>
                    setFormData({ ...formData, workSchedule: e.target.value })
                  }
                  placeholder="full-time, part-time, etc."
                />
              </div>

              <div className="form-group">
                <label htmlFor="status">
                  Estado <span className="required">*</span>
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  required
                >
                  <option value="active">Activo</option>
                  <option value="on_leave">De Baja</option>
                  <option value="terminated">Terminado</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3>Información Personal</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="emergencyContact">
                    Contacto de Emergencia
                  </label>
                  <input
                    type="text"
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergencyContact: e.target.value,
                      })
                    }
                    placeholder="Nombre: +34 600 000 000"
                  />
                </div>
              </div>
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
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
