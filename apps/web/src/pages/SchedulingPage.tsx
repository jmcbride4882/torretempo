import './placeholder.css';

export default function SchedulingPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Planificación de Turnos</h1>
        <p className="page-description">
          Calendario de turnos y horarios
        </p>
      </div>

      <div className="coming-soon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <h2>Planificación de Turnos</h2>
        <p>Esta funcionalidad estará disponible próximamente.</p>
        <ul>
          <li>Calendario estilo Deputy (drag & drop)</li>
          <li>Creación y asignación de turnos</li>
          <li>Detección automática de conflictos</li>
          <li>Gestión de disponibilidad de empleados</li>
          <li>Plantillas de turnos recurrentes</li>
        </ul>
      </div>
    </div>
  );
}
