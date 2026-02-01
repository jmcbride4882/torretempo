import './placeholder.css';

export default function TimeEntriesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Registros de Tiempo</h1>
        <p className="page-description">
          Control horario y fichajes
        </p>
      </div>

      <div className="coming-soon">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        <h2>Control Horario</h2>
        <p>Esta funcionalidad estará disponible próximamente.</p>
        <ul>
          <li>Registro de entrada y salida (clock in/out)</li>
          <li>Geolocalización puntual en eventos</li>
          <li>Historial inmutable de fichajes</li>
          <li>Cálculo automático de horas trabajadas</li>
          <li>Gestión de horas extraordinarias</li>
        </ul>
      </div>
    </div>
  );
}
