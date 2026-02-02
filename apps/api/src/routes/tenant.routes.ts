import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { isStaff } from "../middleware/authorize";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const updateTenantSettingsSchema = z.object({
  locations: z.array(z.string()).optional(),
});

/**
 * GET /tenant/settings
 * Get current tenant settings
 */
router.get("/settings", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        slug: true,
        legalName: true,
        settings: true,
      },
    });

    if (!tenant) {
      res.status(404).json({ error: "Tenant not found" });
      return;
    }

    // Ensure settings has default structure
    const settings = {
      locations: [],
      ...((tenant.settings as any) || {}),
    };

    res.json({
      success: true,
      data: {
        ...tenant,
        settings,
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to get tenant settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /tenant/settings
 * Update tenant settings (Owner/Admin only)
 */
router.put("/settings", isStaff, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = updateTenantSettingsSchema.parse(req.body);

    // Get current settings
    const currentTenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    // Merge with new settings
    const currentSettings = (currentTenant?.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...validatedInput,
    };

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: updatedSettings,
      },
      select: {
        id: true,
        slug: true,
        legalName: true,
        settings: true,
      },
    });

    logger.info({ tenantId }, "Tenant settings updated");

    res.json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error({ error }, "Failed to update tenant settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
