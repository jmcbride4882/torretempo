import { Router } from "express";
import { z } from "zod";
import * as shiftSwapService from "../services/shift-swap.service";
import { isStaff, isAdminOrManager } from "../middleware/authorize";
import { requireModule } from "../middleware/require-module";
import { logger } from "../utils/logger";

const router = Router();

// Apply module requirement to all shift swap routes
router.use(requireModule("advanced_scheduling"));

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSwapRequestSchema = z
  .object({
    shiftId: z.string().uuid("Invalid shift ID"),
    requestedTo: z.string().uuid("Invalid employee ID").optional(),
    targetShiftId: z.string().uuid().optional(),
    reason: z.string().optional(),
    notes: z.string().optional(),
    broadcastToRole: z.boolean().optional(),
  })
  .refine(
    (data) => {
      // Either requestedTo OR broadcastToRole must be specified
      return data.requestedTo || data.broadcastToRole;
    },
    {
      message: "Either requestedTo or broadcastToRole must be specified",
    },
  );

const approveSwapRequestSchema = z.object({
  // Manager approval - userId comes from req.user
});

const rejectSwapRequestSchema = z.object({
  rejectionReason: z.string().min(1, "Rejection reason is required"),
});

const cancelSwapRequestSchema = z.object({
  // Employee cancellation - userId comes from req.user
});

// ============================================================================
// SHIFT SWAP REQUEST ENDPOINTS
// ============================================================================

/**
 * POST /shift-swaps
 * Create a new shift swap request (employee only)
 */
router.post("/shift-swaps", isStaff, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Missing tenant or user context" });
    }

    // Validate request body
    const validation = createSwapRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    // Get the employee ID for the current user
    const employee = await (req as any).prisma.employee.findFirst({
      where: {
        userId,
        tenantId,
        status: "active",
      },
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee profile not found for current user",
      });
    }

    const swapRequest = await shiftSwapService.create(tenantId, {
      shiftId: data.shiftId,
      requestedBy: employee.id,
      requestedTo: data.requestedTo,
      targetShiftId: data.targetShiftId,
      reason: data.reason,
      notes: data.notes,
      broadcastToRole: data.broadcastToRole,
    });

    logger.info("Shift swap request created", {
      tenantId,
      swapRequestId: swapRequest.id,
      requestedBy: employee.id,
    });

    res.status(201).json(swapRequest);
  } catch (error: any) {
    logger.error("Failed to create shift swap request", { error });
    res.status(400).json({
      error: error.message || "Failed to create shift swap request",
    });
  }
});

/**
 * GET /shift-swaps
 * Get all swap requests for tenant
 * - Employees see only their own requests (requested by or to them)
 * - Managers/Admins see all requests
 */
router.get("/shift-swaps", isStaff, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Missing tenant or user context" });
    }

    // Parse query filters
    const status = req.query.status as string | undefined;
    const shiftId = req.query.shiftId as string | undefined;

    let swapRequests;

    // If user is manager/admin, show all requests
    if (["admin", "owner", "manager"].includes(userRole.toLowerCase())) {
      swapRequests = await shiftSwapService.getAll(tenantId, {
        status,
        shiftId,
      });
    } else {
      // Regular employee: only show their own requests
      const employee = await (req as any).prisma.employee.findFirst({
        where: {
          userId,
          tenantId,
          status: "active",
        },
      });

      if (!employee) {
        return res.status(404).json({
          error: "Employee profile not found",
        });
      }

      swapRequests = await shiftSwapService.getByEmployee(
        tenantId,
        employee.id,
      );
    }

    res.json(swapRequests);
  } catch (error: any) {
    logger.error("Failed to fetch shift swap requests", { error });
    res.status(500).json({
      error: error.message || "Failed to fetch shift swap requests",
    });
  }
});

/**
 * GET /shift-swaps/:id
 * Get a specific swap request by ID
 */
router.get("/shift-swaps/:id", isStaff, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(400).json({ error: "Missing tenant context" });
    }

    const swapRequest = await shiftSwapService.getById(tenantId, id);

    // Check if user has permission to view this request
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;

    // Managers/admins can see all
    if (!["admin", "owner", "manager"].includes(userRole.toLowerCase())) {
      // Regular employee: only if they're involved
      const employee = await (req as any).prisma.employee.findFirst({
        where: {
          userId,
          tenantId,
          status: "active",
        },
      });

      if (
        !employee ||
        (swapRequest.requestedBy !== employee.id &&
          swapRequest.requestedTo !== employee.id)
      ) {
        return res.status(403).json({
          error: "You don't have permission to view this swap request",
        });
      }
    }

    res.json(swapRequest);
  } catch (error: any) {
    logger.error("Failed to fetch shift swap request", { error });
    res.status(error.message === "Swap request not found" ? 404 : 500).json({
      error: error.message || "Failed to fetch shift swap request",
    });
  }
});

/**
 * POST /shift-swaps/:id/approve
 * Approve a swap request (manager/admin only)
 */
router.post("/shift-swaps/:id/approve", isAdminOrManager, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Missing tenant or user context" });
    }

    // Validate request body
    const validation = approveSwapRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const swapRequest = await shiftSwapService.approve(tenantId, id, {
      approvedBy: userId,
    });

    logger.info("Shift swap request approved", {
      tenantId,
      swapRequestId: id,
      approvedBy: userId,
    });

    res.json(swapRequest);
  } catch (error: any) {
    logger.error("Failed to approve shift swap request", { error });
    res.status(400).json({
      error: error.message || "Failed to approve shift swap request",
    });
  }
});

/**
 * POST /shift-swaps/:id/reject
 * Reject a swap request (manager/admin only)
 */
router.post("/shift-swaps/:id/reject", isAdminOrManager, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Missing tenant or user context" });
    }

    // Validate request body
    const validation = rejectSwapRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    const data = validation.data;

    const swapRequest = await shiftSwapService.reject(tenantId, id, {
      rejectedBy: userId,
      rejectionReason: data.rejectionReason,
    });

    logger.info("Shift swap request rejected", {
      tenantId,
      swapRequestId: id,
      rejectedBy: userId,
    });

    res.json(swapRequest);
  } catch (error: any) {
    logger.error("Failed to reject shift swap request", { error });
    res.status(400).json({
      error: error.message || "Failed to reject shift swap request",
    });
  }
});

/**
 * POST /shift-swaps/:id/cancel
 * Cancel a swap request (requester only)
 */
router.post("/shift-swaps/:id/cancel", isStaff, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!tenantId || !userId) {
      return res.status(400).json({ error: "Missing tenant or user context" });
    }

    // Validate request body
    const validation = cancelSwapRequestSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors,
      });
    }

    // Get the employee ID for the current user
    const employee = await (req as any).prisma.employee.findFirst({
      where: {
        userId,
        tenantId,
        status: "active",
      },
    });

    if (!employee) {
      return res.status(404).json({
        error: "Employee profile not found",
      });
    }

    const swapRequest = await shiftSwapService.cancel(tenantId, id, {
      cancelledBy: employee.id,
    });

    logger.info("Shift swap request cancelled", {
      tenantId,
      swapRequestId: id,
      cancelledBy: employee.id,
    });

    res.json(swapRequest);
  } catch (error: any) {
    logger.error("Failed to cancel shift swap request", { error });
    res.status(400).json({
      error: error.message || "Failed to cancel shift swap request",
    });
  }
});

export default router;
