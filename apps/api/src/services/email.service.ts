import nodemailer from "nodemailer";
import Handlebars from "handlebars";
import fs from "fs";
import path from "path";
import i18next from "i18next";
import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

const enTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "locales", "en", "translation.json"), "utf-8"));
const esTranslations = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "locales", "es", "translation.json"), "utf-8"));

i18next.init({
  lng: "es",
  fallbackLng: "en",
  resources: { en: { translation: enTranslations }, es: { translation: esTranslations } },
});

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  variables: Record<string, any>;
  language?: string;
}

export class EmailService {
  private async getTenantTransport(tenantId: string): Promise<nodemailer.Transporter | null> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          smtpHost: true,
          smtpPort: true,
          smtpSecure: true,
          smtpUser: true,
          smtpPassword: true,
          smtpFromName: true,
          smtpFromEmail: true,
        },
      });

      if (!tenant || !tenant.smtpHost || !tenant.smtpUser || !tenant.smtpPassword) {
        logger.warn({ tenantId }, "Tenant SMTP configuration incomplete");
        return null;
      }

      const port = tenant.smtpPort || 587;
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host: tenant.smtpHost,
        port: port,
        secure: secure,
        auth: { user: tenant.smtpUser, pass: tenant.smtpPassword },
      });

      return transporter;
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to create tenant transporter");
      return null;
    }
  }

  async sendEmail(tenantId: string, options: EmailOptions): Promise<boolean> {
    const transporter = await this.getTenantTransport(tenantId);
    if (!transporter) {
      logger.error({ tenantId }, "Cannot send email - SMTP not configured for tenant");
      return false;
    }

    try {
      const language = options.language || "es";
      const templatePath = path.join(__dirname, "..", "templates", "emails", language, options.template + ".html");

      if (!fs.existsSync(templatePath)) {
        logger.error({ templatePath }, "Email template not found");
        return false;
      }

      const templateContent = fs.readFileSync(templatePath, "utf-8");
      const template = Handlebars.compile(templateContent);
      const variables = { ...options.variables, year: new Date().getFullYear() };
      const html = template(variables);

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { smtpFromName: true, smtpFromEmail: true, smtpUser: true },
      });

      const fromName = tenant?.smtpFromName || "Torre Tempo";
      const fromEmail = tenant?.smtpFromEmail || tenant?.smtpUser;

      await transporter.sendMail({
        from: fromName + " <" + fromEmail + ">",
        to: options.to,
        subject: options.subject,
        html,
      });

      logger.info({ to: options.to, template: options.template, tenantId }, "Email sent successfully");
      return true;
    } catch (error) {
      logger.error({ error, to: options.to, tenantId }, "Failed to send email");
      return false;
    }
  }

  async sendWelcomeEmail(tenantId: string, email: string, firstName: string, password: string, tenantName: string, language: string = "es"): Promise<boolean> {
    i18next.changeLanguage(language);
    const loginUrl = process.env.APP_URL || "https://time.lsltgroup.es";
    const subject = i18next.t("email.welcome.subject", { tenantName });

    // Fetch tenant slug for company code
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true },
    });
    const tenantSlug = tenant?.slug || 'demo';

    return this.sendEmail(tenantId, {
      to: email,
      subject,
      template: "welcome",
      language,
      variables: {
        greeting: i18next.t("email.welcome.greeting", { firstName }),
        intro: i18next.t("email.welcome.intro", { tenantName }),
        credentials: i18next.t("email.welcome.credentials"),
        companyCodeLabel: i18next.t("email.welcome.companyCode"),
        companyCode: tenantSlug,
        emailLabel: i18next.t("email.welcome.email"),
        email,
        passwordLabel: i18next.t("email.welcome.temporaryPassword"),
        password,
        loginUrl,
        changePassword: i18next.t("email.welcome.changePassword"),
        needHelp: i18next.t("email.welcome.needHelp"),
        footer: i18next.t("email.welcome.footer"),
      },
    });
  }

  async testConnection(tenantId: string): Promise<{ success: boolean; message: string }> {
    try {
      const transporter = await this.getTenantTransport(tenantId);
      if (!transporter) return { success: false, message: "SMTP configuration incomplete" };
      await transporter.verify();
      return { success: true, message: "SMTP connection successful" };
    } catch (error: any) {
      logger.error({ error, tenantId }, "SMTP connection test failed");
      return { success: false, message: error.message || "Connection failed" };
    }
  }

  async testConnectionWithConfig(config: { smtpHost: string; smtpPort: number; smtpSecure?: boolean; smtpUser: string; smtpPassword: string }): Promise<{ success: boolean; message: string }> {
    try {
      const port = config.smtpPort || 587;
      const secure = port === 465;

      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: port,
        secure: secure,
        auth: { user: config.smtpUser, pass: config.smtpPassword },
      });

      await transporter.verify();
      return { success: true, message: "SMTP connection successful" };
    } catch (error: any) {
      logger.error({ error }, "SMTP connection test with config failed");
      return { success: false, message: error.message || "Connection failed" };
    }
  }
}

export const emailService = new EmailService();
