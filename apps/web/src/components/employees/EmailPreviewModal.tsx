import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTenant } from "../../contexts/TenantContext";
import "./EmailPreviewModal.css";

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
  employeeEmail?: string;
}

type Language = "es" | "en";

const EMAIL_TEMPLATES: Record<Language, { subject: string; body: string }> = {
  es: {
    subject: "Bienvenido a {{tenantName}} - Tus credenciales de acceso",
    body: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0;">{{tenantName}}</h1>
    <p style="color: #64748b; margin-top: 8px;">Control de Jornada Laboral</p>
  </div>
  
  <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
    <h2 style="font-size: 24px; font-weight: 600; color: #1e293b; margin: 0 0 16px 0;">
      Bienvenido, {{employeeName}}
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Se ha creado tu cuenta en el sistema de control horario de <strong>{{tenantName}}</strong>. 
      A continuacion encontraras tus credenciales de acceso:
    </p>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <div style="margin-bottom: 16px;">
        <span style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Email</span>
        <span style="font-size: 16px; color: #1e293b; font-weight: 500;">{{employeeEmail}}</span>
      </div>
      <div>
        <span style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Contrasena Temporal</span>
        <span style="font-family: monospace; font-size: 18px; color: #374151; font-weight: 600; letter-spacing: 0.05em;">{{tempPassword}}</span>
      </div>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">
      Por seguridad, te recomendamos cambiar tu contrasena despues del primer inicio de sesion.
    </p>
    
    <a href="{{loginUrl}}" style="display: inline-block; background: linear-gradient(135deg, #374151 0%, #4b5563 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
      Iniciar Sesion
    </a>
  </div>
  
  <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      &copy; {{year}} {{tenantName}}<br>
      Este correo fue enviado automaticamente. Por favor, no responder.
    </p>
  </div>
</div>
    `,
  },
  en: {
    subject: "Welcome to {{tenantName}} - Your login credentials",
    body: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  <div style="text-align: center; margin-bottom: 32px;">
    <h1 style="font-size: 28px; font-weight: 700; color: #1e293b; margin: 0;">{{tenantName}}</h1>
    <p style="color: #64748b; margin-top: 8px;">Time Tracking System</p>
  </div>
  
  <div style="background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
    <h2 style="font-size: 24px; font-weight: 600; color: #1e293b; margin: 0 0 16px 0;">
      Welcome, {{employeeName}}
    </h2>
    
    <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
      Your account has been created in the time tracking system for <strong>{{tenantName}}</strong>. 
      Below you will find your login credentials:
    </p>
    
    <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <div style="margin-bottom: 16px;">
        <span style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Email</span>
        <span style="font-size: 16px; color: #1e293b; font-weight: 500;">{{employeeEmail}}</span>
      </div>
      <div>
        <span style="display: block; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Temporary Password</span>
        <span style="font-family: monospace; font-size: 18px; color: #374151; font-weight: 600; letter-spacing: 0.05em;">{{tempPassword}}</span>
      </div>
    </div>
    
    <p style="color: #64748b; font-size: 14px; margin: 0 0 24px 0;">
      For security, we recommend changing your password after your first login.
    </p>
    
    <a href="{{loginUrl}}" style="display: inline-block; background: linear-gradient(135deg, #374151 0%, #4b5563 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 16px;">
      Sign In
    </a>
  </div>
  
  <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #e2e8f0;">
    <p style="color: #94a3b8; font-size: 12px; margin: 0;">
      &copy; {{year}} {{tenantName}}<br>
      This email was sent automatically. Please do not reply.
    </p>
  </div>
</div>
    `,
  },
};

export default function EmailPreviewModal({
  isOpen,
  onClose,
  employeeName = "Juan Garcia",
  employeeEmail = "juan.garcia@example.com",
}: EmailPreviewModalProps) {
  const { t } = useTranslation();
  const { tenant } = useTenant();
  const [language, setLanguage] = useState<Language>("es");

  const tenantName = tenant?.legalName || "Torre Tempo";
  const loginUrl = tenant?.slug
    ? `${window.location.origin}/t/${tenant.slug}/login`
    : `${window.location.origin}/login`;

  const replaceVariables = (text: string) => {
    return text
      .replace(/{{tenantName}}/g, tenantName)
      .replace(/{{employeeName}}/g, employeeName)
      .replace(/{{employeeEmail}}/g, employeeEmail)
      .replace(/{{tempPassword}}/g, "Temp@1234")
      .replace(/{{loginUrl}}/g, loginUrl)
      .replace(/{{year}}/g, new Date().getFullYear().toString());
  };

  const template = EMAIL_TEMPLATES[language];

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content email-preview-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{t("employees.emailPreview.title")}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Language Toggle */}
          <div className="language-toggle">
            <button
              className={`lang-btn ${language === "es" ? "active" : ""}`}
              onClick={() => setLanguage("es")}
            >
              <span className="flag">🇪🇸</span>
              Espanol
            </button>
            <button
              className={`lang-btn ${language === "en" ? "active" : ""}`}
              onClick={() => setLanguage("en")}
            >
              <span className="flag">🇬🇧</span>
              English
            </button>
          </div>

          {/* Email Header */}
          <div className="email-header-preview">
            <div className="email-field">
              <label>{t("employees.emailPreview.to")}:</label>
              <span>{employeeEmail}</span>
            </div>
            <div className="email-field">
              <label>{t("employees.emailPreview.subject")}:</label>
              <span>{replaceVariables(template.subject)}</span>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="email-body-preview">
            <div
              className="email-content"
              dangerouslySetInnerHTML={{
                __html: replaceVariables(template.body),
              }}
            />
          </div>

          {/* Variables Info */}
          <div className="variables-info">
            <h4>{t("employees.emailPreview.variables")}</h4>
            <ul>
              <li>
                <code>{"{{tenantName}}"}</code> -{" "}
                {t("employees.emailPreview.varTenantName")}
              </li>
              <li>
                <code>{"{{employeeName}}"}</code> -{" "}
                {t("employees.emailPreview.varEmployeeName")}
              </li>
              <li>
                <code>{"{{employeeEmail}}"}</code> -{" "}
                {t("employees.emailPreview.varEmployeeEmail")}
              </li>
              <li>
                <code>{"{{tempPassword}}"}</code> -{" "}
                {t("employees.emailPreview.varTempPassword")}
              </li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
