import { Router } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { platformAdmin } from "../middleware/platform-admin";
import { logger } from "../utils/logger";

const router = Router();
const prisma = new PrismaClient();

/**
 * Platform User Management Routes
 *
 * SECURITY: ALL routes protected by platformAdmin middleware
 * PLATFORM_ADMIN role ONLY - cross-tenant user management
 *
 * These routes bypass tenant isolation for god-mode access across all tenants
 */

// Validation schemas
const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  preferredLanguage: z.enum(["es", "en"]).optional(),
});

/**
 * GET /api/v1/platform/users
 * List all users across all tenants (PLATFORM_ADMIN only)
 *
 * Query params:
 * - tenantId: Optional filter by tenant
 * - page, perPage: Pagination
 * - search: Search by name, email
 * - status: Filter by user status
 *
 * SECURITY: platformAdmin middleware enforced
 */
router.get("/", platformAdmin, async (req, res) => {
  try {
    const { page = 1, perPage = 20, search, tenantId, status } = req.query;

    const skip = (Number(page) - 1) * Number(perPage);
    const take = Number(perPage);

    // Build filter - NO tenant isolation, this is god mode
    const where: any = {};

    // Status filter
    if (status) {
      where.status = status;
    }

    // Tenant filter (via tenantUsers relationship)
    if (tenantId) {
      where.tenantUsers = {
        some: {
          tenantId: tenantId,
        },
      };
    }

    // Search filter
    if (search) {
      where.OR = [
        { firstName: { contains: String(search), mode: "insensitive" } },
        { lastName: { contains: String(search), mode: "insensitive" } },
        { email: { contains: String(search), mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          preferredLanguage: true,
          createdAt: true,
          updatedAt: true,
          tenantUsers: {
            select: {
              role: true,
              tenant: {
                select: {
                  id: true,
                  slug: true,
                  legalName: true,
                },
              },
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: { total, page: Number(page), perPage: Number(perPage) },
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        action: "platform_list_users",
        total,
        tenantFilter: tenantId || "all",
      },
      "Platform admin listed users",
    );
  } catch (error) {
    logger.error({ error }, "Failed to fetch users (platform)");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/v1/platform/users/:id
 * Get single user by ID (cross-tenant)
 *
 * SECURITY: platformAdmin middleware enforced
 */
router.get("/:id", platformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        tenantUsers: {
          select: {
            id: true,
            role: true,
            tenant: {
              select: {
                id: true,
                slug: true,
                legalName: true,
              },
            },
          },
        },
        employees: {
          select: {
            id: true,
            employeeNumber: true,
            position: true,
            status: true,
            tenant: {
              select: {
                id: true,
                slug: true,
                legalName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error(
      { error, userId: req.params.id },
      "Failed to fetch user (platform)",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /api/v1/platform/users/:id
 * Update user (cross-tenant)
 *
 * SECURITY:
 * - platformAdmin middleware enforced
 * - Zod schema validation
 * - Audit logging
 * - Cannot update password (use password reset flow)
 * - Cannot update email (requires separate verification flow)
 */
router.put("/:id", platformAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const validatedInput = updateUserSchema.parse(req.body);

    // Check user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: validatedInput,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        status: true,
        preferredLanguage: true,
        updatedAt: true,
      },
    });

    // Audit log
    logger.info(
      {
        userId: (req as any).user?.userId,
        targetUserId: user.id,
        action: "platform_update_user",
        changes: Object.keys(validatedInput),
      },
      "Platform admin updated user",
    );

    res.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    logger.error(
      { error, userId: req.params.id },
      "Failed to update user (platform)",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/v1/platform/users/:id
 * Delete user (cross-tenant)
 *
 * SECURITY:
 * - platformAdmin middleware enforced
 * - Cascades to related records (employees, tenantUsers)
 * - Audit logging with WARNING level
 * - HARD DELETE (no soft delete for users) - use with extreme caution
 */
router.delete("/:id", platformAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check user exists and get details for audit log
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        tenantUsers: {
          include: {
            tenant: { select: { slug: true, legalName: true } },
          },
        },
      },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent deleting platform admin users
    const isPlatformAdminUser = existingUser.tenantUsers.some(
      (tu) => tu.role?.toLowerCase() === "platform_admin",
    );

    if (isPlatformAdminUser) {
      res.status(403).json({
        error: "Forbidden",
        message: "Cannot delete platform admin users",
      });
      return;
    }

    // Hard delete user (cascades via Prisma schema relations)
    await prisma.user.delete({
      where: { id },
    });

    // Audit log with WARNING level (user deletion is CRITICAL)
    logger.warn(
      {
        userId: (req as any).user?.userId,
        deletedUserId: id,
        deletedUserEmail: existingUser.email,
        tenants: existingUser.tenantUsers.map((tu) => tu.tenant.slug),
        action: "platform_delete_user",
      },
      "CRITICAL: Platform admin HARD DELETED user",
    );

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    logger.error(
      { error, userId: req.params.id },
      "Failed to delete user (platform)",
    );
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
