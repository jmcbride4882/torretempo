import { useState, useEffect } from 'react';
import { tenantService } from '../services/tenantService';
import type { Tenant, SmtpConfig } from '../types/tenant';
import './SettingsPage.css';

export default function SettingsPage() {
  const [, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const [formData, setFormData] = useState<SmtpConfig>({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPassword: '',
    smtpFromName: '',
    smtpFromEmail: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenantService.getSettings();
      setTenant(data);
      
      // Populate form with existing settings
      setFormData({
        smtpHost: data.smtpHost || '',
        smtpPort: data.smtpPort || 587,
        smtpSecure: data.smtpSecure || false,
        smtpUser: data.smtpUser || '',
        smtpPassword: '', // Don't populate password for security
        smtpFromName: data.smtpFromName || '',
        smtpFromEmail: data.smtpFromEmail || '',
      });
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      setError(err.response?.data?.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!formData.smtpHost || !formData.smtpUser || !formData.smtpPassword) {
        setTestResult('❌ Please fill in Host, User, and Password before testing');
        setTesting(false);
        return;
      }

      const result = await tenantService.testSmtp(formData);
      setTestResult(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
    } catch (err: any) {
      setTestResult(`❌ Connection failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);

    try {
      // Validate required fields
      if (!formData.smtpHost || !formData.smtpUser || !formData.smtpPassword) {
        setError('Please fill in all required fields (Host, User, Password)');
        setSaving(false);
        return;
      }

      await tenantService.updateSmtp(formData);
      setSuccess('✅ SMTP settings saved successfully!');
      
      // Reload settings to get updated data
      await loadSettings();
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-header">
          <h1>Settings</h1>
        </div>
        <div className="loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p className="header-description">Configure your tenant settings and email configuration</p>
      </div>

      <div className="settings-section">
        <div className="section-header">
          <h2>Email Configuration (SMTP)</h2>
          <p className="section-description">
            Configure SMTP settings to send emails from your account. These settings are required to send welcome emails to new employees.
          </p>
        </div>

        {error && <div className="error-alert">{error}</div>}
        {success && <div className="success-alert">{success}</div>}
        {testResult && (
          <div className={testResult.includes('✅') ? 'success-alert' : 'error-alert'}>
            {testResult}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-section">
            <h3>Server Settings</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="smtpHost">
                  SMTP Host <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="smtpHost"
                  value={formData.smtpHost}
                  onChange={(e) => setFormData({ ...formData, smtpHost: e.target.value })}
                  placeholder="smtp.gmail.com"
                  required
                />
                <span className="field-hint">Example: smtp.gmail.com, smtp.sendgrid.net</span>
              </div>
              <div className="form-group">
                <label htmlFor="smtpPort">
                  SMTP Port <span className="required">*</span>
                </label>
                <input
                  type="number"
                  id="smtpPort"
                  value={formData.smtpPort}
                  onChange={(e) => setFormData({ ...formData, smtpPort: parseInt(e.target.value) || 587 })}
                  min="1"
                  max="65535"
                  required
                />
                <span className="field-hint">Common: 587 (TLS), 465 (SSL)</span>
              </div>
            </div>
            <div className="form-group">
              <div className="info-box">
                <strong>ℹ️ SSL/TLS Mode:</strong> 
                {formData.smtpPort === 465 ? (
                  <span className="mode-ssl"> SSL (Port 465)</span>
                ) : (
                  <span className="mode-tls"> STARTTLS (Port 587)</span>
                )}
              </div>
              <span className="field-hint">
                Port 465 uses SSL, Port 587 uses STARTTLS (auto-detected)
              </span>
            </div>
          </div>

          <div className="form-section">
            <h3>Authentication</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="smtpUser">
                  SMTP User (Email) <span className="required">*</span>
                </label>
                <input
                  type="email"
                  id="smtpUser"
                  value={formData.smtpUser}
                  onChange={(e) => setFormData({ ...formData, smtpUser: e.target.value })}
                  placeholder="your-email@gmail.com"
                  required
                />
                <span className="field-hint">Your email address or SMTP username</span>
              </div>
              <div className="form-group">
                <label htmlFor="smtpPassword">
                  SMTP Password <span className="required">*</span>
                </label>
                <input
                  type="password"
                  id="smtpPassword"
                  value={formData.smtpPassword}
                  onChange={(e) => setFormData({ ...formData, smtpPassword: e.target.value })}
                  placeholder="••••••••••••"
                  required
                />
                <span className="field-hint">For Gmail, use an App Password</span>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>From Address</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="smtpFromName">From Name</label>
                <input
                  type="text"
                  id="smtpFromName"
                  value={formData.smtpFromName}
                  onChange={(e) => setFormData({ ...formData, smtpFromName: e.target.value })}
                  placeholder="Torre Tempo"
                />
                <span className="field-hint">Name that appears in "From" field</span>
              </div>
              <div className="form-group">
                <label htmlFor="smtpFromEmail">From Email</label>
                <input
                  type="email"
                  id="smtpFromEmail"
                  value={formData.smtpFromEmail}
                  onChange={(e) => setFormData({ ...formData, smtpFromEmail: e.target.value })}
                  placeholder="noreply@example.com"
                />
                <span className="field-hint">Optional: defaults to SMTP User</span>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleTest}
              disabled={testing || saving}
            >
              {testing ? 'Testing...' : '🔌 Test Connection'}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || testing}
            >
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
