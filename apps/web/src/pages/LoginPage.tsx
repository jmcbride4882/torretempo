import { useState, FormEvent } from "react";
import { useParams } from "react-router-dom";
import useTenantNavigate from "../hooks/useTenantNavigate";
import { useAuthStore } from "../stores/authStore";
import "./LoginPage.css";

export default function LoginPage() {
  const tenantNavigate = useTenantNavigate();
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    email: "admin@torretempo.com",
    password: "admin123",
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    if (!tenantSlug) {
      tenantNavigate("/");
      return;
    }

    try {
      await login({ ...formData, tenantSlug });
      tenantNavigate(`/t/${tenantSlug}/dashboard`);
    } catch (err) {
      // Error is handled by the store
      console.error("Login failed:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="login-page">
      {/* Desktop Branding Section (Left Side) */}
      <div className="login-branding">
        <div className="branding-content">
          <div className="branding-logo">
            <svg width="80" height="80" viewBox="0 0 48 48" fill="none">
              <defs>
                <linearGradient
                  id="logoGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#e0e7ff" />
                </linearGradient>
              </defs>
              <rect width="48" height="48" rx="14" fill="url(#logoGradient)" />
              <path
                d="M24 12V24L32 32"
                stroke="#6366f1"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="24"
                cy="24"
                r="14"
                stroke="#6366f1"
                strokeWidth="3"
                fill="none"
                strokeOpacity="0.3"
              />
            </svg>
          </div>
          <h1 className="branding-title">Torre Tempo</h1>
          <p className="branding-subtitle">Control de Jornada Laboral</p>
          <div className="branding-badge">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <polyline points="9 12 11 14 15 10" />
            </svg>
            Sistema conforme RDL 8/2019
          </div>
        </div>
        <footer className="branding-footer">
          <p className="copyright">
            &copy; 2026 Lakeside La Torre (Murcia) Group SL
          </p>
          <p className="developer">Designed and Developed by John McBride</p>
        </footer>
      </div>

      {/* Form Section (Right Side on Desktop, Full on Mobile) */}
      <div className="login-form-section">
        <div className="login-container">
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="login-header">
            <div className="login-logo">
              <svg width="56" height="56" viewBox="0 0 48 48" fill="none">
                <defs>
                  <linearGradient
                    id="logoGradientMobile"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <rect
                  width="48"
                  height="48"
                  rx="14"
                  fill="url(#logoGradientMobile)"
                />
                <path
                  d="M24 12V24L32 32"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="14"
                  stroke="white"
                  strokeWidth="3"
                  fill="none"
                  strokeOpacity="0.3"
                />
              </svg>
            </div>
            <h1 className="login-title">Torre Tempo</h1>
            <p className="login-subtitle">Control de Jornada Laboral</p>
          </div>

          {/* Desktop Form Header */}
          <h2 className="form-title">Iniciar Sesión</h2>
          <p className="form-description">
            Accede a tu cuenta para gestionar el tiempo de tu equipo
          </p>

          {/* Demo Credentials Card */}
          <div className="demo-credentials-card">
            <div className="demo-icon">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="demo-content">
              <strong>Credenciales de Demo</strong>
              <p>Los campos están pre-rellenados para pruebas</p>
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-banner">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{error}</span>
                <button
                  type="button"
                  className="error-close"
                  onClick={clearError}
                  aria-label="Cerrar"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Correo Electrónico
              </label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@torretempo.com"
                  required
                  disabled={isLoading}
                />
                <svg
                  className="input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Contraseña
              </label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  className="form-input form-input-with-toggle"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <svg
                  className="input-icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <svg
                    className="spinner"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      opacity="0.25"
                    />
                    <path
                      d="M12 2 A10 10 0 0 1 22 12"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                  Iniciando sesión...
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <div className="login-footer">
            <div className="login-links">
              <a href="/" className="link-secondary">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
                Volver al inicio
              </a>
              <a href="#" className="link-secondary">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Footer */}
      <footer className="page-footer">
        <p className="copyright">
          &copy; 2026 Lakeside La Torre (Murcia) Group SL
        </p>
        <p className="developer">Designed and Developed by John McBride</p>
      </footer>
    </div>
  );
}
