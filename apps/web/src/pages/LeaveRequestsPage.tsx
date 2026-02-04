import { useAuthorization } from "../hooks/useAuthorization";
import "./placeholder.css";

export default function LeaveRequestsPage() {
  const { isPlatformAdmin } = useAuthorization();

  // Platform admins need tenant selection (future feature)
  if (isPlatformAdmin()) {
    return (
      <div className="platform-admin-placeholder">
        <div className="placeholder-content">
          <h2>Platform Admin - Tenant Selection Required</h2>
          <p>
            As a platform administrator, you need to select a specific tenant to
            view their leave requests.
          </p>
          <p>🚧 Tenant selector coming soon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Solicitudes de Ausencias</h1>
        <p className="page-description">
          Gestión de vacaciones, permisos y bajas
        </p>
      </div>

      <div className="coming-soon">
        <svg
          width="80"
          height="80"
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
        <h2>Gestión de Ausencias</h2>
        <p>Esta funcionalidad estará disponible próximamente.</p>
        <ul>
          <li>Solicitud de vacaciones y permisos</li>
          <li>Flujo de aprobación configurable</li>
          <li>Cálculo automático de saldos</li>
          <li>Notificaciones automáticas</li>
          <li>Historial de solicitudes</li>
        </ul>
      </div>
    </div>
  );
}
