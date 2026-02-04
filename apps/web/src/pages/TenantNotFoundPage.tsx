/**
 * Torre Tempo - Tenant Not Found Page
 *
 * Displayed when a tenant slug doesn't exist or has been removed.
 * Full-page error display with branding and return action.
 */

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function TenantNotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="tenant-error-page">
      {/* Error Card */}
      <div className="error-card">
        {/* Logo */}
        <div className="error-logo">
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient
                id="logoGradient404"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14" fill="url(#logoGradient404)" />
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

        {/* Error Badge */}
        <div className="error-badge">
          <span className="error-code">404</span>
        </div>

        {/* Content */}
        <h1 className="error-title">
          {t("tenant.error.notFound.title", "Tenant Not Found")}
        </h1>
        <p className="error-description">
          {t(
            "tenant.error.notFound.pageDescription",
            "The tenant you're looking for doesn't exist or has been removed.",
          )}
        </p>
        <p className="error-hint">
          {t(
            "tenant.error.notFound.hint",
            "Please check the URL and try again, or return to the home page.",
          )}
        </p>

        {/* Actions */}
        <div className="error-actions">
          <Link to="/" className="btn-primary">
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
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {t("common.returnHome", "Return to Home")}
          </Link>
        </div>

        {/* Brand Name */}
        <div className="brand-label">Torre Tempo</div>
      </div>

      {/* Footer */}
      <footer className="page-footer">
        <p className="copyright">
          &copy; {new Date().getFullYear()} Lakeside La Torre (Murcia) Group SL
        </p>
        <p className="developer">Designed and Developed by John McBride</p>
      </footer>

      <style>{`
        .tenant-error-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: linear-gradient(-45deg, #374151, #4b5563, #6b7280, #374151);
          background-size: 400% 400%;
          animation: gradient-flow 15s ease infinite;
          position: relative;
        }

        .tenant-error-page::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 30% 20%, rgba(239, 68, 68, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        @keyframes gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .error-card {
          position: relative;
          z-index: 1;
          background: #ffffff;
          border-radius: 20px;
          padding: 3rem 2.5rem;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slide-up 0.5s ease-out;
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .error-logo {
          margin-bottom: 1.5rem;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .error-logo svg {
          filter: drop-shadow(0 4px 12px rgba(239, 68, 68, 0.3));
        }

        .error-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem 1.25rem;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #fecaca;
          border-radius: 50px;
          margin-bottom: 1.5rem;
        }

        .error-code {
          font-size: 1.125rem;
          font-weight: 800;
          color: #ef4444;
          letter-spacing: 0.1em;
        }

        .error-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 1rem;
          letter-spacing: -0.02em;
        }

        .error-description {
          font-size: 1rem;
          color: #64748b;
          margin: 0 0 0.5rem;
          line-height: 1.6;
        }

        .error-hint {
          font-size: 0.875rem;
          color: #94a3b8;
          margin: 0 0 2rem;
          line-height: 1.5;
        }

        .error-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 2rem;
        }

        .btn-primary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          height: 52px;
          padding: 0 1.75rem;
          background: linear-gradient(135deg, #374151 0%, #f87171 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.2s ease-out;
          box-shadow: 0 4px 14px rgba(55, 65, 81, 0.35);
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(55, 65, 81, 0.4);
        }

        .btn-primary:active {
          transform: translateY(0);
        }

        .brand-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.05em;
        }

        .page-footer {
          position: relative;
          z-index: 1;
          margin-top: 2rem;
          padding: 1rem;
          text-align: center;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
        }

        .page-footer .copyright {
          font-size: 0.8125rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 0.25rem;
        }

        .page-footer .developer {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.75);
          margin: 0;
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .tenant-error-page {
            padding: 1rem;
          }

          .error-card {
            padding: 2rem 1.5rem;
            border-radius: 16px;
          }

          .error-title {
            font-size: 1.5rem;
          }

          .error-description {
            font-size: 0.9375rem;
          }

          .btn-primary {
            width: 100%;
            height: 56px;
          }
        }

        /* Accessibility */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }

        .btn-primary:focus-visible {
          outline: 2px solid #374151;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
