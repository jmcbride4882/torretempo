import { useState } from 'react';
import { employeeService } from '../../services/employeeService';
import type { CreateEmployeeInput } from '../../types/employee';
import './AddEmployeeModal.css';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddEmployeeModal({ isOpen, onClose, onSuccess }: AddEmployeeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateEmployeeInput>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'employee',
    nationalId: '',
    socialSecurity: '',
    phone: '',
    emergencyContact: '',
    employeeNumber: '',
    position: '',
    contractType: 'indefinido',
    hireDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
    workSchedule: 'full-time',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.email || !formData.firstName || !formData.lastName) {
        setError('Email, nombre y apellidos son obligatorios');
        setLoading(false);
        return;
      }

      if (!formData.nationalId || !formData.socialSecurity) {
        setError('DNI/NIE y Seguridad Social son obligatorios');
        setLoading(false);
        return;
      }

      await employeeService.create(formData);
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Failed to create employee:', err);
      setError(err.response?.data?.message || 'Error al crear empleado');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      role: 'employee',
      nationalId: '',
      socialSecurity: '',
      phone: '',
      emergencyContact: '',
      employeeNumber: '',
      position: '',
      contractType: 'indefinido',
      hireDate: new Date().toISOString().split('T')[0] + 'T00:00:00.000Z',
      workSchedule: 'full-time',
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Agregar Empleado</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-alert">{error}</div>}

            <div className="form-section">
              <h3>Información del Usuario</h3>
              <div className="form-group">
                <label htmlFor="email">
                  Email <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="empleado@ejemplo.com"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="firstName">
                    Nombre <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Juan"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="lastName">
                    Apellidos <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="García López"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="role">
                  Nivel de Acceso <span className="required">*</span>
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  required
                >
                  <option value="employee">Empleado - Acceso básico (solo sus datos)</option>
                  <option value="manager">Manager - Gestión de empleados y turnos</option>
                  <option value="admin">Administrador - Acceso completo al sistema</option>
                </select>
              </div>
            </div>

            <div className="form-section">
              <h3>Información Personal</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="nationalId">
                    DNI/NIE <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                    placeholder="12345678A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="socialSecurity">
                    Seguridad Social <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="socialSecurity"
                    value={formData.socialSecurity}
                    onChange={(e) => setFormData({ ...formData, socialSecurity: e.target.value })}
                    placeholder="123456789012"
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone">Teléfono</label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="emergencyContact">Contacto de Emergencia</label>
                  <input
                    type="text"
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Nombre: +34 600 000 000"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Información Laboral</h3>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="employeeNumber">Número de Empleado</label>
                  <input
                    type="text"
                    id="employeeNumber"
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    placeholder="EMP001"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="position">Puesto</label>
                  <input
                    type="text"
                    id="position"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Camarero, Chef, etc."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="contractType">
                    Tipo de Contrato <span className="required">*</span>
                  </label>
                  <select
                    id="contractType"
                    value={formData.contractType}
                    onChange={(e) => setFormData({ ...formData, contractType: e.target.value as any })}
                    required
                  >
                    <option value="indefinido">Indefinido</option>
                    <option value="temporal">Temporal</option>
                    <option value="practicas">Prácticas</option>
                    <option value="formacion">Formación</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="hireDate">
                    Fecha de Ingreso <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    id="hireDate"
                    value={formData.hireDate.split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value + 'T00:00:00.000Z' })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="workSchedule">Horario de Trabajo</label>
                <input
                  type="text"
                  id="workSchedule"
                  value={formData.workSchedule}
                  onChange={(e) => setFormData({ ...formData, workSchedule: e.target.value })}
                  placeholder="full-time, part-time, etc."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
