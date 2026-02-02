import apiClient from "./api";
import type { Tenant, SmtpConfig, SmtpTestResult } from "../types/tenant";

export const tenantService = {
  // Get tenant settings
  async getSettings(): Promise<Tenant> {
    const response = await apiClient.get("/tenant/settings");
    return response.data.data;
  },

  // Update SMTP configuration
  async updateSmtp(config: SmtpConfig): Promise<Tenant> {
    const response = await apiClient.put("/tenant/smtp", config);
    return response.data.data;
  },

  // Test SMTP connection with provided config
  async testSmtp(config: SmtpConfig): Promise<SmtpTestResult> {
    const response = await apiClient.post("/tenant/smtp/test", config);
    return response.data;
  },

  // Update tenant settings (locations, etc.)
  async updateSettings(settings: { locations?: string[] }): Promise<Tenant> {
    const response = await apiClient.put("/tenant/settings", settings);
    return response.data.data;
  },
};
