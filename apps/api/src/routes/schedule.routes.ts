import { Router } from "express";
import { z } from "zod";
import { ScheduleService } from "../services/schedule.service";
import { ShiftService } from "../services/shift.service";
import { isStaff } from "../middleware/authorize";
import { requireModule } from "../middleware/require-module";
import { logger } from "../utils/logger";

const router = Router();
const scheduleService = new ScheduleService();
const shiftService = new ShiftService();

// Apply module requirement to all schedule routes
router.use(requireModule("advanced_scheduling"));

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createScheduleSchema = z.object({
  title: z.string().min(1, "Title is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  departmentId: z.string().uuid().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const updateScheduleSchema = z.object({
  title: z.string().min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  departmentId: z.string().uuid().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
});

const publishScheduleSchema = z.object({
  // No body required for publish
});

const lockScheduleSchema = z.object({
  reason: z.string().optional(),
});

const unlockScheduleSchema = z.object({
  reason: z.string().min(1, "Unlock reason is required"),
});

const copyScheduleSchema = z.object({
  targetStartDate: z.string().datetime(),
  targetEndDate: z.string().datetime(),
  copyAssignments: z.boolean().optional().default(true),
});

const createShiftSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  breakMinutes: z.number().int().min(0).optional().default(0),
  role: z.string().optional(),
  location: z.string().optional(),
  workCenter: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  notes: z.string().optional(),
});

const updateShiftSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  breakMinutes: z.number().int().min(0).optional(),
  role: z.string().optional(),
  location: z.string().optional(),
  workCenter: z.string().optional(),
  employeeId: z.string().uuid().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  notes: z.string().optional(),
});

const duplicateShiftSchema = z.object({
  targetDate: z.string().datetime(),
  preserveAssignment: z.boolean().optional().default(true),
});

// ============================================================================
// SCHEDULE ENDPOINTS
// ============================================================================

/**
 * GET /schedules
 * Get all schedules for tenant
 */
router.get("/schedules", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const filters = {
      status: req.query.status as string | undefined,
      startDate: req.query.start_date
        ? new Date(req.query.start_date as string)
        : undefined,
      endDate: req.query.end_date
        ? new Date(req.query.end_date as string)
        : undefined,
      departmentId: req.query.department_id as string | undefined,
    };

    const schedules = await scheduleService.getAll(tenantId, filters);

    res.json({ success: true, data: schedules });
  } catch (error) {
    logger.error({ error }, "Failed to fetch schedules");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /schedules/:id
 * Get schedule by ID
 */
router.get("/schedules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const schedule = await scheduleService.getById(id, tenantId);

    res.json({ success: true, data: schedule });
  } catch (error) {
    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    logger.error({ error }, "Failed to fetch schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules
 * Create new schedule (Admin/Manager only)
 */
router.post("/schedules", isStaff, async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId || !userId) {
      res.status(400).json({ error: "Tenant ID and User ID required" });
      return;
    }

    const validatedInput = createScheduleSchema.parse(req.body);

    const input = {
      title: validatedInput.title,
      startDate: new Date(validatedInput.startDate),
      endDate: new Date(validatedInput.endDate),
      departmentId: validatedInput.departmentId,
      location: validatedInput.location,
      notes: validatedInput.notes,
    };

    const schedule = await scheduleService.create(input, tenantId, userId);

    res.status(201).json({ success: true, data: schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to create schedule");
      res.status(400).json({
        error: "Failed to create schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to create schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /schedules/:id
 * Update schedule (Admin/Manager only)
 */
router.put("/schedules/:id", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = updateScheduleSchema.parse(req.body);

    const input = {
      title: validatedInput.title,
      startDate: validatedInput.startDate
        ? new Date(validatedInput.startDate)
        : undefined,
      endDate: validatedInput.endDate
        ? new Date(validatedInput.endDate)
        : undefined,
      departmentId: validatedInput.departmentId,
      location: validatedInput.location,
      notes: validatedInput.notes,
    };

    const schedule = await scheduleService.update(id, input, tenantId);

    res.json({ success: true, data: schedule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to update schedule");
      res.status(400).json({
        error: "Failed to update schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to update schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /schedules/:id
 * Delete schedule (soft delete) - Admin/Manager only
 */
router.delete("/schedules/:id", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const result = await scheduleService.delete(id, tenantId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to delete schedule");
      res.status(400).json({
        error: "Failed to delete schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to delete schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules/:id/publish
 * Publish draft schedule (Admin/Manager only)
 */
router.post("/schedules/:id/publish", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId || !userId) {
      res.status(400).json({ error: "Tenant ID and User ID required" });
      return;
    }

    const result = await scheduleService.publish(id, tenantId, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to publish schedule");
      res.status(400).json({
        error: "Failed to publish schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to publish schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules/:id/unpublish
 * Unpublish published schedule back to draft (Admin/Manager only)
 */
router.post("/schedules/:id/unpublish", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId || !userId) {
      res.status(400).json({ error: "Tenant ID and User ID required" });
      return;
    }

    const result = await scheduleService.unpublish(id, tenantId, userId);

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to unpublish schedule");
      res.status(400).json({
        error: "Failed to unpublish schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to unpublish schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules/:id/lock
 * Lock published schedule (Admin/Manager only)
 */
router.post("/schedules/:id/lock", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId || !userId) {
      res.status(400).json({ error: "Tenant ID and User ID required" });
      return;
    }

    const validatedInput = lockScheduleSchema.parse(req.body);

    const result = await scheduleService.lock(
      id,
      tenantId,
      userId,
      validatedInput.reason,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to lock schedule");
      res.status(400).json({
        error: "Failed to lock schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to lock schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules/:id/unlock
 * Unlock locked schedule (Admin/Manager only)
 */
router.post("/schedules/:id/unlock", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = unlockScheduleSchema.parse(req.body);

    const result = await scheduleService.unlock(
      id,
      tenantId,
      validatedInput.reason,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to unlock schedule");
      res.status(400).json({
        error: "Failed to unlock schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to unlock schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules/:id/copy
 * Copy schedule to new date range (Admin/Manager only)
 */
router.post("/schedules/:id/copy", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;
    const userId = (req as any).user?.userId;

    if (!tenantId || !userId) {
      res.status(400).json({ error: "Tenant ID and User ID required" });
      return;
    }

    const validatedInput = copyScheduleSchema.parse(req.body);

    const result = await scheduleService.copy(
      id,
      tenantId,
      userId,
      new Date(validatedInput.targetStartDate),
      new Date(validatedInput.targetEndDate),
      validatedInput.copyAssignments,
    );

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Schedule not found") {
      res.status(404).json({ error: "Schedule not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to copy schedule");
      res.status(400).json({
        error: "Failed to copy schedule",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to copy schedule");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
// SHIFT ENDPOINTS
// ============================================================================

/**
 * GET /schedules/:scheduleId/shifts
 * Get all shifts for schedule
 */
router.get("/schedules/:scheduleId/shifts", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const filters = {
      employeeId: req.query.employee_id as string | undefined,
      role: req.query.role as string | undefined,
      hasConflicts:
        req.query.has_conflicts === "true"
          ? true
          : req.query.has_conflicts === "false"
            ? false
            : undefined,
    };

    const shifts = await shiftService.getAllForSchedule(
      scheduleId,
      tenantId,
      filters,
    );

    res.json({ success: true, data: shifts });
  } catch (error) {
    logger.error({ error }, "Failed to fetch shifts");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /schedules/:scheduleId/shifts
 * Create new shift (Admin/Manager only)
 */
router.post("/schedules/:scheduleId/shifts", isStaff, async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = createShiftSchema.parse(req.body);

    const input = {
      scheduleId,
      startTime: new Date(validatedInput.startTime),
      endTime: new Date(validatedInput.endTime),
      breakMinutes: validatedInput.breakMinutes,
      role: validatedInput.role,
      location: validatedInput.location,
      workCenter: validatedInput.workCenter,
      employeeId: validatedInput.employeeId,
      color: validatedInput.color,
      notes: validatedInput.notes,
    };

    const shift = await shiftService.create(input, tenantId);

    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to create shift");
      res.status(400).json({
        error: "Failed to create shift",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to create shift");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /shifts/:id
 * Get shift by ID
 */
router.get("/shifts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const shift = await shiftService.getById(id, tenantId);

    res.json({ success: true, data: shift });
  } catch (error) {
    if (error instanceof Error && error.message === "Shift not found") {
      res.status(404).json({ error: "Shift not found" });
      return;
    }

    logger.error({ error }, "Failed to fetch shift");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PUT /shifts/:id
 * Update shift (Admin/Manager only)
 */
router.put("/shifts/:id", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = updateShiftSchema.parse(req.body);

    const input = {
      startTime: validatedInput.startTime
        ? new Date(validatedInput.startTime)
        : undefined,
      endTime: validatedInput.endTime
        ? new Date(validatedInput.endTime)
        : undefined,
      breakMinutes: validatedInput.breakMinutes,
      role: validatedInput.role,
      location: validatedInput.location,
      workCenter: validatedInput.workCenter,
      employeeId: validatedInput.employeeId,
      color: validatedInput.color,
      notes: validatedInput.notes,
    };

    const shift = await shiftService.update(id, input, tenantId);

    res.json({ success: true, data: shift });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Shift not found") {
      res.status(404).json({ error: "Shift not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to update shift");
      res.status(400).json({
        error: "Failed to update shift",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to update shift");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /shifts/:id
 * Delete shift (soft delete) - Admin/Manager only
 */
router.delete("/shifts/:id", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const result = await shiftService.delete(id, tenantId);

    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Shift not found") {
      res.status(404).json({ error: "Shift not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to delete shift");
      res.status(400).json({
        error: "Failed to delete shift",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to delete shift");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /shifts/:id/duplicate
 * Duplicate shift to new date (Admin/Manager only)
 */
router.post("/shifts/:id/duplicate", isStaff, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const validatedInput = duplicateShiftSchema.parse(req.body);

    const shift = await shiftService.duplicate(
      id,
      tenantId,
      new Date(validatedInput.targetDate),
      validatedInput.preserveAssignment,
    );

    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
      return;
    }

    if (error instanceof Error && error.message === "Shift not found") {
      res.status(404).json({ error: "Shift not found" });
      return;
    }

    if (error instanceof Error) {
      logger.warn({ error: error.message }, "Failed to duplicate shift");
      res.status(400).json({
        error: "Failed to duplicate shift",
        message: error.message,
      });
      return;
    }

    logger.error({ error }, "Failed to duplicate shift");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /schedules/:scheduleId/conflicts
 * Get all conflicts for schedule
 */
router.get("/schedules/:scheduleId/conflicts", async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const tenantId = (req as any).tenantId;

    if (!tenantId) {
      res.status(400).json({ error: "Tenant ID required" });
      return;
    }

    const result = await shiftService.getAllConflictsForSchedule(
      scheduleId,
      tenantId,
    );

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error({ error }, "Failed to fetch conflicts");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
