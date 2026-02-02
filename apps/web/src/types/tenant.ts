export interface Tenant {
  id: string;
  slug: string;
  legalName: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
  settings?: {
    locations?: string[];
    roles?: Array<{
      name: string;
      color: string;
    }>;
  };
}

export interface SmtpConfig {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPassword: string;
  smtpFromName?: string;
  smtpFromEmail?: string;
}

export interface SmtpTestResult {
  success: boolean;
  message: string;
}
