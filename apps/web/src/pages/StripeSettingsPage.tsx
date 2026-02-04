import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import './StripeSettingsPage.css';

interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
}

export default function StripeSettingsPage() {
  const { user } = useAuthStore();
  const [config, setConfig] = useState<StripeConfig>({
    secretKey: '',
    publishableKey: '',
    webhookSecret: '',
  });
  const [savedConfig, setSavedConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showKeys, setShowKeys] = useState(false);

  const isPlatformAdmin = user?.role?.toUpperCase() === 'PLATFORM_ADMIN';
  const webhookUrl = `${window.location.origin}/api/v1/platform/stripe/webhook`;

  useEffect(() => {
    if (isPlatformAdmin) {
      loadStripeConfig();
    }
  }, [isPlatformAdmin]);

  const loadStripeConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/platform/settings/stripe', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setSavedConfig(result.data);
        setConfig(result.data);
      }
    } catch (error) {
      console.error('Failed to load Stripe config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setTestResult(null);

      const response = await fetch('/api/v1/platform/settings/stripe', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const result = await response.json();
        setSavedConfig(result.data);
        alert('Stripe configuration saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save Stripe config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch('/api/v1/platform/settings/stripe/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ secretKey: config.secretKey }),
      });

      const result = await response.json();
      setTestResult({
        success: response.ok,
        message: response.ok ? 'Connection successful!' : result.error || 'Connection failed',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Failed to test connection',
      });
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  if (!isPlatformAdmin) {
    return (
      <div className="stripe-settings-page">
        <div className="error-message">Access denied. PLATFORM_ADMIN role required.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="stripe-settings-page">
        <div className="loading">Loading Stripe configuration...</div>
      </div>
    );
  }

  return (
    <div className="stripe-settings-page">
      <div className="settings-header">
        <h1>Stripe Payment Configuration</h1>
        <p className="header-subtitle">
          Configure Stripe API keys for processing subscription payments
        </p>
      </div>

      <div className="instructions-card">
        <h2>Setup Instructions</h2>
        <ol>
          <li>
            <strong>Create Stripe Account:</strong> Sign up at{' '}
            <a href="https://dashboard.stripe.com/register" target="_blank" rel="noopener noreferrer">
              dashboard.stripe.com
            </a>
          </li>
          <li>
            <strong>Get API Keys:</strong> Go to{' '}
            <a
              href="https://dashboard.stripe.com/test/apikeys"
              target="_blank"
              rel="noopener noreferrer"
            >
              Developers → API Keys
            </a>
          </li>
          <li>
            <strong>Copy Keys:</strong> Copy your <strong>Secret Key</strong> and{' '}
            <strong>Publishable Key</strong>
          </li>
          <li>
            <strong>Configure Webhook:</strong> Go to{' '}
            <a
              href="https://dashboard.stripe.com/test/webhooks"
              target="_blank"
              rel="noopener noreferrer"
            >
              Developers → Webhooks
            </a>{' '}
            and add this endpoint:
            <div className="webhook-url-box">
              <code>{webhookUrl}</code>
              <button
                className="btn-copy"
                onClick={() => copyToClipboard(webhookUrl)}
                title="Copy webhook URL"
              >
                Copy
              </button>
            </div>
          </li>
          <li>
            <strong>Select Events:</strong> Subscribe to these webhook events:
            <ul>
              <li>customer.subscription.created</li>
              <li>customer.subscription.updated</li>
              <li>customer.subscription.deleted</li>
              <li>invoice.payment_succeeded</li>
              <li>invoice.payment_failed</li>
            </ul>
          </li>
          <li>
            <strong>Copy Webhook Secret:</strong> After creating the webhook, copy the{' '}
            <strong>Signing Secret</strong>
          </li>
        </ol>
      </div>

      <div className="config-card">
        <h2>API Configuration</h2>

        <div className="form-group">
          <label htmlFor="secretKey">
            Secret Key <span className="required">*</span>
          </label>
          <div className="input-with-toggle">
            <input
              type={showKeys ? 'text' : 'password'}
              id="secretKey"
              value={config.secretKey}
              onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
              placeholder="sk_test_... or sk_live_..."
              className="input-field"
            />
          </div>
          <span className="help-text">
            Starts with sk_test_ (testing) or sk_live_ (production)
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="publishableKey">
            Publishable Key <span className="required">*</span>
          </label>
          <input
            type="text"
            id="publishableKey"
            value={config.publishableKey}
            onChange={(e) => setConfig({ ...config, publishableKey: e.target.value })}
            placeholder="pk_test_... or pk_live_..."
            className="input-field"
          />
          <span className="help-text">
            Starts with pk_test_ (testing) or pk_live_ (production)
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="webhookSecret">
            Webhook Signing Secret <span className="required">*</span>
          </label>
          <div className="input-with-toggle">
            <input
              type={showKeys ? 'text' : 'password'}
              id="webhookSecret"
              value={config.webhookSecret}
              onChange={(e) => setConfig({ ...config, webhookSecret: e.target.value })}
              placeholder="whsec_..."
              className="input-field"
            />
          </div>
     
