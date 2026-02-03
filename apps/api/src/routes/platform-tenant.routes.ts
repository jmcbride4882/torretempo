import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { isPlatformAdmin } from "../middleware/authorize";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Platform Tenant Management Routes
 *
 * SECURITY: ALL routes protected by isPlatformAdmin middleware
 * PLATFORM_ADMIN role ONLY - manages all tenants across the platform
 */

// Validation schemas
const createTenantSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  legalName: z.string().min(1).max(200),
  taxId: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),

  // Localization
  timezone: z.string().default("Europe/Madrid"),
  locale: z.string().default("es-ES"),
  currency: z.string().default("EUR"),

  // SMTP Configuration (tenant-specific email)
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpSecure: z.boolean().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFromName: z.string().optional(),
  smtpFromEmail: z.string().email().optional(),

  // Subscription
  subscriptionStatus: z
    .enum(["trial", "active", "suspended", "cancelled"])
    .default("active"),
  maxEmployees: z.number().int().min(1).optional(),
});

const updateTenantSchema = createTenantSchema.partial().omit({ slug: true });

/**
 * GET /api/v1/platform/tenants
 * List all tenants (PLATFORM_ADMIN only)
 *
 * SECURITY: isPlatformAdmin middleware enforced
 */
router.get("/", isPlatformAdmin, async (req, res) => {
  try {
    const { page = 1, perPage = 20, search, subscriptionStatus } = req.query;

    const skip = (Number(page) - 1) * Number(perPage);
    const take = Number(perPage);

    // Build filter
    const where: any = { deletedAt: null };

    if (subscriptionStatus) {
      where.subscriptionStatus = subscriptionStatus;
    }

    if (search) {
      where.OR = [
        { slug: { contains: String(search), mode: "insensitive" } },
        { legalName: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [tenants, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          slug: true,
          legalName: true,
          email: true,
          phone: true,
          subscriptionStatus: true,
          maxEmployees: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { employees: true },
          },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      success: true,
      data: tenants,
      meta: { total, page: Number(page), perPage: Number(perPage) },
    });

    // Audit log
    logger.info(
      { userId: (req as any).user?.userId, action: "list_tenants", total },
      "Platform admin listed tenants",
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch tenants");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/platform/tenants/:id
 * Get single tenant details (PLATFORM_ADMIN only)
 *
 * SECURITY: isPlatformAdmin middleware enforced
 */
router.get("/:id", isPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            employees: true,
            tenantUsers: true,
            departments: true,
          },
        },
      },
    });

    if (!tenant || tenant.deletedAt) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // SECURITY: Mask SMTP password in response
    const sanitizedTenant = {
      ...tenant,
      smtpPassword: tenant.smtpPassword ? "********" : null,
    };

    res.json({ success: true, data: sanitizedTenant });
  } catch (error) {
    logger.error({ error, tenantId: req.params.id }, "Failed to fetch tenant");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/v1/platform/tenants
 * Create new tenant (PLATFORM_ADMIN only)
 *
 * SECURITY:
 * - isPlatformAdmin middleware enforced
 * - Zod schema validation
 * - Unique slug validation
 * - Audit logging
 */
router.post("/", isPlatformAdmin, async (req, res) => {
  try {
    const validatedInput = createTenantSchema.parse(req.body);

    // SECURITY: Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: validatedInput.slug },
    });

    if (existingTenant) {
      res.status(400).json({
        error: "Validation error",
        message: `Tenant with slug '${validatedInput.slug}' already exists`,
      });
      return;
    }

    const tenant = await prisma.tenant.create({
      data: validatedInput,
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        tenantId: tenant.id,
        slug: tenant.slug,
        action: "create_tenant",
      },
      "Platform admin created tenant",
    );

    res.status(201).json({ success: true, data: tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error({ error }, "Failed to create tenant");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/v1/platform/tenants/:id
 * Update tenant (PLATFORM_ADMIN only)
 *
 * SECURITY:
 * - isPlatformAdmin middleware enforced
 * - Zod schema validation
 * - Audit logging
 */
router.put("/:id", isPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedInput = updateTenantSchema.parse(req.body);

    // Check tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant || existingTenant.deletedAt) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: validatedInput,
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        tenantId: tenant.id,
        action: "update_tenant",
        changes: Object.keys(validatedInput),
      },
      "Platform admin updated tenant",
    );

    res.json({ success: true, data: tenant });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error({ error, tenantId: req.params.id }, "Failed to update tenant");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/v1/platform/tenants/:id
 * Soft delete tenant (PLATFORM_ADMIN only)
 *
 * SECURITY:
 * - isPlatformAdmin middleware enforced
 * - Soft delete only (preserves data for audit/compliance)
 * - Audit logging with WARNING level
 */
router.delete("/:id", isPlatformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant || existingTenant.deletedAt) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Soft delete
    await prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log with WARNING level (tenant deletion is critical)
    logger.warn(
      {
        userId: (req as any).user?.userId,
        tenantId: id,
        tenantSlug: existingTenant.slug,
        action: "delete_tenant",
      },
      "CRITICAL: Platform admin soft deleted tenant",
    );

    res.json({ success: true, message: "Tenant deleted successfully" });
  } catch (error) {
    logger.error({ error, tenantId: req.params.id }, "Failed to delete tenant");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
