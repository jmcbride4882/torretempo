import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { isPlatformAdmin } from "../middleware/authorize";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Platform Billing Management Routes
 *
 * SECURITY: ALL routes protected by isPlatformAdmin middleware
 * PLATFORM_ADMIN role ONLY - manages billing for all tenants
 */

// Validation schemas
const updateSubscriptionSchema = z.object({
  subscriptionStatus: z.enum(["trial", "active", "suspended", "cancelled"]),
  maxEmployees: z.number().int().min(1).optional(),
  subscriptionPlan: z.string().optional(),
});

/**
 * GET /api/v1/platform/billing/subscriptions
 * Get all tenant subscriptions with billing info
 *
 * SECURITY: isPlatformAdmin middleware enforced
 */
router.get("/subscriptions", isPlatformAdmin, async (req, res) => {
  try {
    const { page = 1, perPage = 20, subscriptionStatus, search } = req.query;

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
          subscriptionStatus: true,
          subscriptionPlan: true,
          maxEmployees: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              employees: true,
            },
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
      {
        userId: (req as any).user?.userId,
        action: "list_billing_subscriptions",
        total,
      },
      "Platform admin listed billing subscriptions",
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch billing subscriptions");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/platform/billing/revenue
 * Calculate platform revenue metrics
 *
 * SECURITY: isPlatformAdmin middleware enforced
 */
router.get("/revenue", isPlatformAdmin, async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        createdAt: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    });

    // Calculate revenue metrics
    // TODO: Replace with actual pricing model from database
    const MONTHLY_PRICE = 49; // €49/month per tenant (placeholder)

    const activeTenants = tenants.filter(
      (t) => t.subscriptionStatus === "active",
    );
    const trialTenants = tenants.filter(
      (t) => t.subscriptionStatus === "trial",
    );
    const suspendedTenants = tenants.filter(
      (t) => t.subscriptionStatus === "suspended",
    );
    const cancelledTenants = tenants.filter(
      (t) => t.subscriptionStatus === "cancelled",
    );

    const mrr = activeTenants.length * MONTHLY_PRICE;
    const arr = mrr * 12;

    // Calculate total employees across all active tenants
    const totalEmployees = activeTenants.reduce(
      (sum, tenant) => sum + tenant._count.employees,
      0,
    );

    res.json({
      success: true,
      data: {
        mrr,
        arr,
        metrics: {
          activeTenants: activeTenants.length,
          trialTenants: trialTenants.length,
          suspendedTenants: suspendedTenants.length,
          cancelledTenants: cancelledTenants.length,
          totalTenants: tenants.length,
          totalEmployees,
        },
      },
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        action: "view_revenue_metrics",
        mrr,
        arr,
      },
      "Platform admin viewed revenue metrics",
    );
  } catch (error) {
    logger.error({ error }, "Failed to calculate revenue");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/platform/billing/subscriptions/:tenantId
 * Get single tenant subscription details
 *
 * SECURITY: isPlatformAdmin middleware enforced
 */
router.get("/subscriptions/:tenantId", isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        legalName: true,
        email: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        maxEmployees: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        _count: {
          select: {
            employees: true,
            timeEntries: true,
            schedules: true,
          },
        },
      },
    });

    if (!tenant || tenant.deletedAt) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    res.json({ success: true, data: tenant });
  } catch (error) {
    logger.error(
      { error, tenantId: req.params.tenantId },
      "Failed to fetch tenant subscription",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/v1/platform/billing/subscriptions/:tenantId
 * Update tenant subscription status
 *
 * SECURITY:
 * - isPlatformAdmin middleware enforced
 * - Zod schema validation
 * - Audit logging with WARNING level
 */
router.put("/subscriptions/:tenantId", isPlatformAdmin, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const validatedInput = updateSubscriptionSchema.parse(req.body);

    // Check tenant exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant || existingTenant.deletedAt) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: validatedInput,
    });

    // Audit log with WARNING level (subscription changes are critical)
    logger.warn(
      {
        userId: (req as any).user?.userId,
        tenantId,
        tenantSlug: tenant.slug,
        action: "update_subscription",
        changes: validatedInput,
      },
      "CRITICAL: Platform admin updated tenant subscription",
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

    logger.error(
      { error, tenantId: req.params.tenantId },
      "Failed to update subscription",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
