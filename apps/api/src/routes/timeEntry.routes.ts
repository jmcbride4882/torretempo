import { Router } from "express";
import { z } from "zod";
import { authorize } from "../middleware/authorize";
import {
  TimeEntryError,
  TimeEntryService,
} from "../services/timeEntry.service";
import { logger } from "../utils/logger";

const router = Router();
const timeEntryService = new TimeEntryService();

const timeEntryAccess = authorize("owner", "admin", "manager", "employee");
router.use(timeEntryAccess);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const geolocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  timestamp: z.string().datetime(),
});

const clockInSchema = z.object({
  shiftId: z.string().uuid().optional(),
  geolocation: geolocationSchema.optional(),
  notes: z.string().optional(),
});

const clockOutSchema = z.object({
  geolocation: geolocationSchema.optional(),
  breakMinutes: z.number().int().min(0).optional(),
  notes: z.string().optional(),
});

const historyQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  entryType: z.enum(["scheduled", "unscheduled"]).optional(),
  status: z.enum(["active", "corrected", "deleted"]).optional(),
  page: z.preprocess(
    (value) => (value === undefined ? 1 : Number(value)),
    z.number().int().min(1),
  ),
  limit: z.preprocess(
    (value) => (value === undefined ? 50 : Number(value)),
    z.number().int().min(1).max(200),
  ),
  sortBy: z.enum(["clockIn", "clockOut", "createdAt"]).default("clockIn"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const statsQuerySchema = z.object({
  employeeId: z.string().uuid().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

function getUserContext(req: any) {
  const user = req.user;
  const userId = user?.userId || user?.id;
  const userEmail = user?.email;

  if (!userId || !userEmail) {
    return null;
  }

  return {
    userId,
    userEmail,
  };
}

function isElevatedRole(role?: string) {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return ["owner", "admin", "manager", "platform_admin"].includes(normalized);
}

// ============================================================================
// TIME ENTRY ENDPOINTS
// ============================================================================

/**
 * POST /time-entries/clock-in
 */
router.post("/clock-in", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userContext = getUserContext(req);

    if (!tenantId || !userContext) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    const input = clockInSchema.parse(req.body);

    const entry = await timeEntryService.clockIn(
      tenantId,
      userContext.userId,
      input,
      {
        userId: userContext.userId,
        userEmail: userContext.userEmail,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    );

    res.status(201).json({
      success: true,
      data: {
        id: entry.id,
        employeeId: entry.employeeId,
        clockIn: entry.clockIn,
        clockOut: null,
        shiftId: entry.shiftId,
        entryType: entry.entryType,
        clockInLat: entry.clockInLat,
        clockInLng: entry.clockInLng,
        status: entry.status,
        breakMinutes: entry.breakMinutes,
        totalHours: entry.totalHours,
        overtimeHours: entry.overtimeHours,
        createdAt: entry.createdAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
      return;
    }

    if (error instanceof TimeEntryError) {
      res.status(error.status).json({
        error: error.message,
        code: error.code,
        ...(error.details || {}),
      });
      return;
    }

    logger.error({ error }, "Failed to clock in");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /time-entries/clock-out
 */
router.post("/clock-out", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userContext = getUserContext(req);

    if (!tenantId || !userContext) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    const input = clockOutSchema.parse(req.body);

    const entry = await timeEntryService.clockOut(
      tenantId,
      userContext.userId,
      input,
      {
        userId: userContext.userId,
        userEmail: userContext.userEmail,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      },
    );

    res.json({
      success: true,
      data: {
        id: entry.id,
        employeeId: entry.employeeId,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        shiftId: entry.shiftId,
        entryType: entry.entryType,
        clockInLat: entry.clockInLat,
        clockInLng: entry.clockInLng,
        clockOutLat: entry.clockOutLat,
        clockOutLng: entry.clockOutLng,
        breakMinutes: entry.breakMinutes,
        totalHours: entry.totalHours,
        overtimeHours: entry.overtimeHours,
        status: entry.status,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
      return;
    }

    if (error instanceof TimeEntryError) {
      res.status(error.status).json({
        error: error.message,
        code: error.code,
        ...(error.details || {}),
      });
      return;
    }

    logger.error({ error }, "Failed to clock out");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /time-entries/current
 */
router.get("/current", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userContext = getUserContext(req);

    if (!tenantId || !userContext) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    const entry = await timeEntryService.getCurrent(
      tenantId,
      userContext.userId,
    );

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    if (error instanceof TimeEntryError) {
      res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
      return;
    }

    logger.error({ error }, "Failed to fetch current entry");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /time-entries
 */
router.get("/", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userContext = getUserContext(req);
    const userRole = (req as any).user?.role;

    if (!tenantId || !userContext) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    const query = historyQuerySchema.parse(req.query);
    let employeeId = query.employeeId;

    if (!isElevatedRole(userRole)) {
      if (query.employeeId) {
        res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
        return;
      }

      const employee = await timeEntryService.getEmployeeForUser(
        tenantId,
        userContext.userId,
      );
      employeeId = employee.id;
    }

    const result = await timeEntryService.getHistory(tenantId, {
      employeeId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      entryType: query.entryType,
      status: query.status,
      page: query.page,
      limit: query.limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
      return;
    }

    if (error instanceof TimeEntryError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }

    logger.error({ error }, "Failed to fetch time entry history");
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /time-entries/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const tenantId = (req as any).tenantId;
    const userContext = getUserContext(req);
    const userRole = (req as any).user?.role;

    if (!tenantId || !userContext) {
      res.status(401).json({ error: "Unauthorized", code: "UNAUTHORIZED" });
      return;
    }

    const query = statsQuerySchema.parse(req.query);

    if (query.employeeId && !isElevatedRole(userRole)) {
      res.status(403).json({ error: "Forbidden", code: "FORBIDDEN" });
      return;
    }

    let employeeId = query.employeeId;
    if (!employeeId && !isElevatedRole(userRole)) {
      const employee = await timeEntryService.getEmployeeForUser(
        tenantId,
        userContext.userId,
      );
      employeeId = employee.id;
    }

    const stats = await timeEntryService.getStats(tenantId, {
      employeeId,
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
    });

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ error: "Validation error", details: error.errors });
      return;
    }

    if (error instanceof TimeEntryError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }

    logger.error({ error }, "Failed to fetch time entry stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
