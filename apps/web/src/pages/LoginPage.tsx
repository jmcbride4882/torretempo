import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();

  const [formData, setFormData] = useState({
    tenantSlug: 'demo',
    email: 'admin@torretempo.com',
    password: 'admin123',
  });

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();

    try {
      await login(formData);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by the store
      console.error('Login failed:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="#3B82F6"/>
              <path d="M16 8V16L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="login-title">Torre Tempo</h1>
          <p className="login-subtitle">Control de Jornada Laboral</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-banner">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="tenantSlug" className="form-label">
              Empresa (Tenant)
            </label>
            <input
              type="text"
              id="tenantSlug"
              name="tenantSlug"
              className="form-input"
              value={formData.tenantSlug}
              onChange={handleChange}
              placeholder="demo"
              required
              disabled={isLoading}
            />
            <span className="form-hint">El identificador único de tu empresa</span>
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Correo Electrónico
            </label>
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
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              className="form-input"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                  <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round"/>
                </svg>
                Iniciando sesión...
              </>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="demo-note">
            <strong>Demo Credentials:</strong> Pre-filled for testing
          </p>
          <div className="login-links">
            <a href="/" className="link-secondary">← Volver al inicio</a>
            <a href="#" className="link-secondary">¿Olvidaste tu contraseña?</a>
          </div>
        </div>
      </div>

      <footer className="page-footer">
        <p className="copyright">© 2026 Lakeside La Torre (Murcia) Group SL</p>
        <p className="developer">Designed and Developed by John McBride</p>
      </footer>
    </div>
  );
}
