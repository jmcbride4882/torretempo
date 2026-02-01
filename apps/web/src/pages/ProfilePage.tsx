import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { employeeService } from '../services/employeeService';
import type { Employee } from '../types/employee';
import './ProfilePage.css';

export default function ProfilePage() {
  const { t } = useTranslation();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    emergencyContact: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAll();
      // Employee endpoint returns filtered data for employees (only their own record)
      if (data.length > 0) {
        const employeeData = data[0];
        setEmployee(employeeData);
        setFormData({
          phone: employeeData.phone || '',
          emergencyContact: employeeData.emergencyContact || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.message || 'Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!employee) return;

    try {
      setLoading(true);
      setError(null);
      await employeeService.update(employee.id, formData);
      await loadProfile();
      setIsEditing(false);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const getContractTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      indefinido: t('employee.contractIndefinido'),
      temporal: t('employee.contractTemporal'),
      practicas: t('employee.contractPracticas'),
      formacion: t('employee.contractFormacion'),
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: t('employee.active'),
      on_leave: t('employee.onLeave'),
      terminated: t('employee.terminated'),
    };
    return labels[status] || status;
  };

  if (loading && !employee) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1>{t('user.profile')}</h1>
        </div>
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error && !employee) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1>{t('user.profile')}</h1>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="profile-page">
        <div className="profile-header">
          <h1>{t('user.profile')}</h1>
        </div>
        <div className="error-message">No se encontró información del empleado</div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>{t('user.profile')}</h1>
        {!isEditing ? (
          <button className="btn-primary" onClick={() => setIsEditing(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            {t('common.edit')}
          </button>
        ) : (
          <div className="button-group">
            <button className="btn-secondary" onClick={() => {
              setIsEditing(false);
              setFormData({
                phone: employee.phone || '',
                emergencyContact: employee.emergencyContact || '',
              });
            }}>
              {t('common.cancel')}
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? t('employee.saving') : t('common.save')}
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="profile-content">
        {/* User Avatar */}
        <div className="profile-avatar">
          <div className="avatar-large">
            {employee.user.firstName.charAt(0)}
            {employee.user.lastName.charAt(0)}
          </div>
          <h2>{employee.user.firstName} {employee.user.lastName}</h2>
          {employee.employeeNumber && (
            <p className="employee-number-large">#{employee.employeeNumber}</p>
          )}
        </div>

        {/* User Information */}
        <div className="profile-section">
          <h3>{t('employee.userInfo')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('auth.email')}</label>
              <p>{employee.user.email}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.accessLevel')}</label>
              <p className="role-badge">
                {employee.user.role === 'PLATFORM_ADMIN' && '🌐 Platform Administrator'}
                {employee.user.role === 'OWNER' && '👑 Business Owner'}
                {employee.user.role === 'ADMIN' && t('employee.roleAdmin')}
                {employee.user.role === 'MANAGER' && t('employee.roleManager')}
                {employee.user.role === 'EMPLOYEE' && t('employee.roleEmployee')}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="profile-section">
          <h3>{t('employee.personalInfo')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('employee.firstName')}</label>
              <p>{employee.user.firstName}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.lastName')}</label>
              <p>{employee.user.lastName}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.nationalId')}</label>
              <p>{employee.nationalId}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.socialSecurity')}</label>
              <p>{employee.socialSecurity}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.phone')}</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+34 XXX XXX XXX"
                />
              ) : (
                <p>{employee.phone || '-'}</p>
              )}
            </div>
            <div className="info-item">
              <label>{t('employee.emergencyContact')}</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  placeholder="Nombre y teléfono"
                />
              ) : (
                <p>{employee.emergencyContact || '-'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Employment Information */}
        <div className="profile-section">
          <h3>{t('employee.employmentInfo')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>{t('employee.position')}</label>
              <p>{employee.position || '-'}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.contractType')}</label>
              <p>{getContractTypeLabel(employee.contractType)}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.hireDate')}</label>
              <p>{new Date(employee.hireDate).toLocaleDateString('es-ES')}</p>
            </div>
            <div className="info-item">
              <label>{t('employee.status')}</label>
              <p>{getStatusLabel(employee.status)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
