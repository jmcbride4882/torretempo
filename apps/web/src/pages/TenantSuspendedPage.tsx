/**
 * Torre Tempo - Tenant Suspended Page
 *
 * Displayed when a tenant account has been suspended.
 * Full-page error display with branding and support guidance.
 */

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function TenantSuspendedPage() {
  const { t } = useTranslation();

  return (
    <div className="tenant-suspended-page">
      {/* Error Card */}
      <div className="suspended-card">
        {/* Logo */}
        <div className="suspended-logo">
          <svg width="64" height="64" viewBox="0 0 48 48" fill="none">
            <defs>
              <linearGradient
                id="logoGradient403"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
            </defs>
            <rect width="48" height="48" rx="14" fill="url(#logoGradient403)" />
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

        {/* Warning Icon Badge */}
        <div className="suspended-badge">
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
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="badge-text">
            {t("tenant.error.suspended.badge", "Account Suspended")}
          </span>
        </div>

        {/* Content */}
        <h1 className="suspended-title">
          {t("tenant.error.suspended.title", "Account Suspended")}
        </h1>
        <p className="suspended-description">
          {t(
            "tenant.error.suspended.pageDescription",
            "This tenant account is currently suspended. Please contact support for assistance.",
          )}
        </p>

        {/* Info Card */}
        <div className="info-card">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <p>
            {t(
              "tenant.error.suspended.supportInfo",
              "If you believe this is an error, please reach out to your administrator or Torre Tempo support.",
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="suspended-actions">
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
        .tenant-suspended-page {
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

        .tenant-suspended-page::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(circle at 30% 20%, rgba(245, 158, 11, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 70% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
          pointer-events: none;
        }

        @keyframes gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .suspended-card {
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

        .suspended-logo {
          margin-bottom: 1.5rem;
          animation: float 6s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .suspended-logo svg {
          filter: drop-shadow(0 4px 12px rgba(245, 158, 11, 0.3));
        }

        .suspended-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
          border: 2px solid #fcd34d;
          border-radius: 50px;
          margin-bottom: 1.5rem;
          color: #b45309;
        }

        .suspended-badge svg {
          flex-shrink: 0;
        }

        .badge-text {
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .suspended-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1e293b;
          margin: 0 0 1rem;
          letter-spacing: -0.02em;
        }

        .suspended-description {
          font-size: 1rem;
          color: #64748b;
          margin: 0 0 1.5rem;
          line-height: 1.6;
        }

        .info-card {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 1rem;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 2rem;
          text-align: left;
        }

        .info-card svg {
          flex-shrink: 0;
          color: #64748b;
          margin-top: 2px;
        }

        .info-card p {
          font-size: 0.875rem;
          color: #64748b;
          margin: 0;
          line-height: 1.5;
        }

        .suspended-actions {
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
          background: linear-gradient(135deg, #374151 0%, #f59e0b 100%);
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
          .tenant-suspended-page {
            padding: 1rem;
          }

          .suspended-card {
            padding: 2rem 1.5rem;
            border-radius: 16px;
          }

          .suspended-title {
            font-size: 1.5rem;
          }

          .suspended-description {
            font-size: 0.9375rem;
          }

          .info-card {
            padding: 0.875rem;
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
