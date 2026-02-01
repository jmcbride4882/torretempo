import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="nav">
        <div className="nav-container">
          <div className="nav-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#3B82F6"/>
              <path d="M16 8V16L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
            <span className="nav-title">Torre Tempo</span>
          </div>
          <button className="btn-login" onClick={handleLoginClick}>
            Iniciar Sesión
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <div className="hero-badge">
            <span className="badge-dot"></span>
            Cumplimiento RDL 8/2019
          </div>
          <h1 className="hero-title">
            Control de Jornada Laboral
            <br />
            <span className="hero-gradient">Inteligente y Conforme</span>
          </h1>
          <p className="hero-subtitle">
            Sistema SaaS multi-tenant de control horario y planificación de turnos
            diseñado específicamente para el sector hostelería en España.
            100% conforme con la legislación laboral española.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={handleLoginClick}>
              Probar Demo
            </button>
            <a href="#features" className="btn-secondary">
              Ver Características
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="stat-value">100%</div>
              <div className="stat-label">Cumplimiento Legal</div>
            </div>
            <div className="stat">
              <div className="stat-value">GDPR</div>
              <div className="stat-label">Protección de Datos</div>
            </div>
            <div className="stat">
              <div className="stat-value">4 años</div>
              <div className="stat-label">Retención Automática</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="features-container">
          <div className="section-header">
            <h2 className="section-title">Características Principales</h2>
            <p className="section-subtitle">
              Todo lo que necesitas para gestionar el tiempo de tu equipo de forma legal y eficiente
            </p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <h3 className="feature-title">Control Horario</h3>
              <p className="feature-description">
                Registro de entrada y salida con geolocalización puntual (solo en eventos).
                Historial inmutable con trazabilidad completa.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
              </div>
              <h3 className="feature-title">Planificación de Turnos</h3>
              <p className="feature-description">
                Sistema Deputy-style de arrastrar y soltar. Detección automática de conflictos
                y gestión de disponibilidad de empleados.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <h3 className="feature-title">Solicitudes de Ausencias</h3>
              <p className="feature-description">
                Gestión digital de vacaciones, permisos y bajas. Flujo de aprobación
                configurable con notificaciones automáticas.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h3 className="feature-title">Cumplimiento Normativo</h3>
              <p className="feature-description">
                100% conforme RDL 8/2019, GDPR y LOPDGDD. Exportaciones firmadas
                digitalmente para inspecciones de trabajo.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <h3 className="feature-title">Multi-Tenant</h3>
              <p className="feature-description">
                Arquitectura multi-tenant segura. Cada empresa con sus propios datos,
                configuraciones y módulos activados.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon" style={{ background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <h3 className="feature-title">Módulos de Pago</h3>
              <p className="feature-description">
                Sistema modular: funcionalidad base + 7 módulos opcionales.
                Activa solo lo que necesites para tu negocio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <h2 className="cta-title">¿Listo para empezar?</h2>
          <p className="cta-subtitle">
            Prueba la demo con credenciales de acceso completo
          </p>
          <button className="btn-cta" onClick={handleLoginClick}>
            Acceder a la Demo
          </button>
          <div className="cta-credentials">
            <p><strong>Email:</strong> admin@torretempo.com</p>
            <p><strong>Contraseña:</strong> admin123</p>
            <p><strong>Tenant:</strong> demo</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                  <rect width="32" height="32" rx="8" fill="#3B82F6"/>
                  <path d="M16 8V16L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                <span>Torre Tempo</span>
              </div>
              <p className="footer-tagline">
                Control de jornada laboral conforme con la legislación española
              </p>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Producto</h4>
                <a href="#features">Características</a>
                <a href="#pricing">Precios</a>
                <a href="#modules">Módulos</a>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <a href="#privacy">Privacidad</a>
                <a href="#terms">Términos</a>
                <a href="#compliance">Cumplimiento</a>
              </div>
              <div className="footer-column">
                <h4>Soporte</h4>
                <a href="#docs">Documentación</a>
                <a href="#contact">Contacto</a>
                <a href="#api">API</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">
              <p>© 2026 Lakeside La Torre (Murcia) Group SL</p>
              <p className="footer-developer">Designed and Developed by John McBride</p>
            </div>
            <p className="footer-tech">
              API Status: <span className="status-dot"></span> Operativo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
