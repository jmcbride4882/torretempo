import { useState, useEffect } from "react";
import "./TenantModal.css";

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "create" | "edit";
  tenant?: Tenant | null;
}

interface Tenant {
  id: string;
  slug: string;
  legalName: string;
  taxId?: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  subscriptionStatus: "trial" | "active" | "suspended" | "cancelled";
  trialEndsAt?: string;
  maxEmployees?: number;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
}

interface TenantFormData {
  slug: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  subscriptionStatus: "trial" | "active" | "suspended" | "cancelled";
  trialEndsAt: string;
  maxEmployees: string;
  smtpHost: string;
  smtpPort: string;
  smtpUser: string;
  smtpPass: string;
  smtpFromName: string;
  smtpFromEmail: string;
}

export default function TenantModal({
  isOpen,
  onClose,
  onSuccess,
  mode,
  tenant,
}: TenantModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSmtpSection, setShowSmtpSection] = useState(false);

  const getInitialFormData = (): TenantFormData => {
    if (mode === "edit" && tenant) {
      return {
        slug: tenant.slug || "",
        legalName: tenant.legalName || "",
        taxId: tenant.taxId || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        address: tenant.address || "",
        city: tenant.city || "",
        postalCode: tenant.postalCode || "",
        country: tenant.country || "ES",
        subscriptionStatus: tenant.subscriptionStatus || "trial",
        trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.split("T")[0] : "",
        maxEmployees: tenant.maxEmployees?.toString() || "",
        smtpHost: tenant.smtpHost || "",
        smtpPort: tenant.smtpPort?.toString() || "587",
        smtpUser: tenant.smtpUser || "",
        smtpPass: "", // Never pre-fill password for security
        smtpFromName: tenant.smtpFromName || "",
        smtpFromEmail: tenant.smtpFromEmail || "",
      };
    }

    return {
      slug: "",
      legalName: "",
      taxId: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "ES",
      subscriptionStatus: "trial",
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0], // 30 days
      maxEmployees: "50",
      smtpHost: "",
      smtpPort: "587",
      smtpUser: "",
      smtpPass: "",
      smtpFromName: "",
      smtpFromEmail: "",
    };
  };

  const [formData, setFormData] =
    useState<TenantFormData>(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setError(null);
      setShowSmtpSection(mode === "edit" && !!tenant?.smtpHost);
    }
  }, [isOpen, mode, tenant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.legalName || !formData.email) {
        setError("Legal name and email are required");
        setLoading(false);
        return;
      }

      if (mode === "create" && !formData.slug) {
        setError("Slug is required");
        setLoading(false);
        return;
      }

      // Validate slug format (lowercase, alphanumeric, hyphens only)
      if (mode === "create") {
        const slugRegex = /^[a-z0-9-]+$/;
        if (!slugRegex.test(formData.slug)) {
          setError("Slug must be lowercase letters, numbers, and hyphens only");
          setLoading(false);
          return;
        }
      }

      // Build request payload
      const payload: any = {
        legalName: formData.legalName,
        email: formData.email,
        subscriptionStatus: formData.subscriptionStatus,
      };

      if (mode === "create") {
        payload.slug = formData.slug;
      }

      // Optional fields
      if (formData.taxId) payload.taxId = formData.taxId;
      if (formData.phone) payload.phone = formData.phone;
      if (formData.address) payload.address = formData.address;
      if (formData.city) payload.city = formData.city;
      if (formData.postalCode) payload.postalCode = formData.postalCode;
      if (formData.country) payload.country = formData.country;
      if (formData.trialEndsAt)
        payload.trialEndsAt = new Date(formData.trialEndsAt).toISOString();
      if (formData.maxEmployees)
        payload.maxEmployees = parseInt(formData.maxEmployees, 10);

      // SMTP config (only if section is shown and fields are filled)
      if (showSmtpSection && formData.smtpHost) {
        payload.smtpHost = formData.smtpHost;
        payload.smtpPort = parseInt(formData.smtpPort, 10) || 587;
        if (formData.smtpUser) payload.smtpUser = formData.smtpUser;
        if (formData.smtpPass) payload.smtpPass = formData.smtpPass;
        if (formData.smtpFromName) payload.smtpFromName = formData.smtpFromName;
        if (formData.smtpFromEmail)
          payload.smtpFromEmail = formData.smtpFromEmail;
      }

      const url =
        mode === "create"
          ? "/api/v1/platform/tenants"
          : `/api/v1/platform/tenants/${tenant?.id}`;

      const method = mode === "create" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(
          result.error || `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error(`Failed to ${mode} tenant:`, err);
      setError(
        err.message ||
          `Error ${mode === "create" ? "creating" : "updating"} tenant`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData(getInitialFormData());
    setError(null);
    setShowSmtpSection(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal-content tenant-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{mode === "create" ? "Create New Tenant" : "Edit Tenant"}</h2>
          <button className="modal-close" onClick={handleClose}>
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

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-alert">{error}</div>}

            {/* Basic Information */}
            <div className="form-section">
              <h3>Basic Information</h3>

              {mode === "create" && (
                <div className="form-group">
                  <label htmlFor="slug">
                    Tenant Slug <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="slug"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slug: e.target.value.toLowerCase(),
                      })
                    }
                    placeholder="demo-company"
                    pattern="^[a-z0-9-]+$"
                    required
                    disabled={mode !== "create"}
                  />
                  <small className="field-hint">
                    Lowercase letters, numbers, and hyphens only. Cannot be
                    changed later.
                  </small>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="legalName">
                  Legal Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="legalName"
                  value={formData.legalName}
                  onChange={(e) =>
                    setFormData({ ...formData, legalName: e.target.value })
                  }
                  placeholder="Demo Company SL"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="taxId">Tax ID / CIF</label>
                  <input
                    type="text"
                    id="taxId"
                    value={formData.taxId}
                    onChange={(e) =>
                      setFormData({ ...formData, taxId: e.target.value })
                    }
                    placeholder="B12345678"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">
                    Contact Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="contact@example.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone</label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+34 600 000 000"
                />
              </div>
            </div>

            {/* Address */}
            <div className="form-section">
              <h3>Address</h3>

              <div className="form-group">
                <label htmlFor="address">Street Address</label>
                <input
                  type="text"
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Calle Example, 123"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Madrid"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="postalCode">Postal Code</label>
                  <input
                    type="text"
                    id="postalCode"
                    value={formData.postalCode}
                    onChange={(e) =>
                      setFormData({ ...formData, postalCode: e.target.value })
                    }
                    placeholder="28001"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="country">Country</label>
                <select
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                >
                  <option value="ES">Spain</option>
                  <option value="FR">France</option>
                  <option value="PT">Portugal</option>
                  <option value="IT">Italy</option>
                  <option value="DE">Germany</option>
                  <option value="UK">United Kingdom</option>
                </select>
              </div>
            </div>

            {/* Subscription */}
            <div className="form-section">
              <h3>Subscription</h3>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="subscriptionStatus">
                    Status <span className="required">*</span>
                  </label>
                  <select
                    id="subscriptionStatus"
                    value={formData.subscriptionStatus}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subscriptionStatus: e.target.value as any,
                      })
                    }
                    required
                  >
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="trialEndsAt">Trial End Date</label>
                  <input
                    type="date"
                    id="trialEndsAt"
                    value={formData.trialEndsAt}
                    onChange={(e) =>
                      setFormData({ ...formData, trialEndsAt: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="maxEmployees">Max Employees</label>
                <input
                  type="number"
                  id="maxEmployees"
                  value={formData.maxEmployees}
                  onChange={(e) =>
                    setFormData({ ...formData, maxEmployees: e.target.value })
                  }
                  placeholder="50"
                  min="1"
                />
                <small className="field-hint">
                  Leave empty for unlimited employees
                </small>
              </div>
            </div>

            {/* SMTP Configuration */}
            <div className="form-section">
              <div className="section-header-with-toggle">
                <h3>SMTP Configuration (Optional)</h3>
                <button
                  type="button"
                  className="btn-toggle"
                  onClick={() => setShowSmtpSection(!showSmtpSection)}
                >
                  {showSmtpSection ? "Hide" : "Configure"}
                </button>
              </div>

              {showSmtpSection && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="smtpHost">SMTP Host</label>
                      <input
                        type="text"
                        id="smtpHost"
                        value={formData.smtpHost}
                        onChange={(e) =>
                          setFormData({ ...formData, smtpHost: e.target.value })
                        }
                        placeholder="smtp.gmail.com"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="smtpPort">SMTP Port</label>
                      <input
                        type="number"
                        id="smtpPort"
                        value={formData.smtpPort}
                        onChange={(e) =>
                          setFormData({ ...formData, smtpPort: e.target.value })
                        }
                        placeholder="587"
                        min="1"
                        max="65535"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="smtpUser">SMTP Username</label>
                      <input
                        type="text"
                        id="smtpUser"
                        value={formData.smtpUser}
                        onChange={(e) =>
                          setFormData({ ...formData, smtpUser: e.target.value })
                        }
                        placeholder="your-email@gmail.com"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="smtpPass">SMTP Password</label>
                      <input
                        type="password"
                        id="smtpPass"
                        value={formData.smtpPass}
                        onChange={(e) =>
                          setFormData({ ...formData, smtpPass: e.target.value })
                        }
                        placeholder={
                          mode === "edit" ? "••••••••" : "App password"
                        }
                      />
                      {mode === "edit" && (
                        <small className="field-hint">
                          Leave empty to keep existing password
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="smtpFromName">From Name</label>
                      <input
                        type="text"
                        id="smtpFromName"
                        value={formData.smtpFromName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            smtpFromName: e.target.value,
                          })
                        }
                        placeholder="Torre Tempo"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="smtpFromEmail">From Email</label>
                      <input
                        type="email"
                        id="smtpFromEmail"
                        value={formData.smtpFromEmail}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            smtpFromEmail: e.target.value,
                          })
                        }
                        placeholder="noreply@torretempo.com"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                  ? "Create Tenant"
                  : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
