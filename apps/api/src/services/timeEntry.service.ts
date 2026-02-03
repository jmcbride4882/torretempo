import { Prisma, PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export interface GeolocationInput {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface ClockInInput {
  shiftId?: string;
  geolocation?: GeolocationInput;
  notes?: string;
}

export interface ClockOutInput {
  geolocation?: GeolocationInput;
  breakMinutes?: number;
  notes?: string;
}

export interface RequestContext {
  userId: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

export class TimeEntryError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status: number = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

interface TimeTrackingSettings {
  autoBreakRules: Array<{ minHours: number; breakMinutes: number }>;
  allowManualBreakOverride: boolean;
  standardHours: number;
  geolocation: {
    enabled: boolean;
    required: boolean;
    clockInRequired: boolean;
    clockOutRequired: boolean;
    maxAccuracy?: number;
  };
}

export class TimeEntryService {
  private async getTenantSettings(
    tenantId: string,
  ): Promise<TimeTrackingSettings> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as any) || {};
    const timeTracking = settings.timeTracking || {};

    return {
      autoBreakRules: timeTracking.autoBreakRules || [
        { minHours: 4, breakMinutes: 15 },
        { minHours: 6, breakMinutes: 30 },
        { minHours: 9, breakMinutes: 45 },
      ],
      allowManualBreakOverride:
        timeTracking.allowManualBreakOverride !== undefined
          ? timeTracking.allowManualBreakOverride
          : true,
      standardHours: timeTracking.standardHours || 8,
      geolocation: {
        enabled:
          timeTracking.geolocation?.enabled !== undefined
            ? timeTracking.geolocation.enabled
            : false,
        required: Boolean(timeTracking.geolocation?.required),
        clockInRequired: Boolean(timeTracking.geolocation?.clockInRequired),
        clockOutRequired: Boolean(timeTracking.geolocation?.clockOutRequired),
        maxAccuracy: timeTracking.geolocation?.maxAccuracy,
      },
    };
  }

  async getEmployeeForUser(tenantId: string, userId: string) {
    const employee = await prisma.employee.findFirst({
      where: {
        tenantId,
        userId,
        status: "active",
        deletedAt: null,
      },
    });

    if (!employee) {
      throw new TimeEntryError("EMPLOYEE_NOT_FOUND", "Employee not found", 404);
    }

    return employee;
  }

  private validateGeolocation(
    settings: TimeTrackingSettings,
    geolocation: GeolocationInput | undefined,
    requiredForAction: boolean,
  ) {
    if (!settings.geolocation.enabled) {
      return;
    }

    if (requiredForAction && !geolocation) {
      throw new TimeEntryError(
        "GEOLOCATION_REQUIRED",
        "Geolocation is required for this tenant",
      );
    }

    if (geolocation && settings.geolocation.maxAccuracy !== undefined) {
      if (geolocation.accuracy > settings.geolocation.maxAccuracy) {
        throw new TimeEntryError(
          "GEOLOCATION_ACCURACY_TOO_LOW",
          "Geolocation accuracy exceeds maximum allowed",
        );
      }
    }
  }

  private calculateAutoBreakMinutes(
    totalHours: number,
    rules: Array<{ minHours: number; breakMinutes: number }>,
  ) {
    const sortedRules = [...rules].sort((a, b) => a.minHours - b.minHours);
    let breakMinutes = 0;

    for (const rule of sortedRules) {
      if (totalHours >= rule.minHours) {
        breakMinutes = rule.breakMinutes;
      }
    }

    return breakMinutes;
  }

  async clockIn(
    tenantId: string,
    userId: string,
    input: ClockInInput,
    context: RequestContext,
  ) {
    const employee = await this.getEmployeeForUser(tenantId, userId);
    const settings = await this.getTenantSettings(tenantId);

    const requiresGeo =
      settings.geolocation.required || settings.geolocation.clockInRequired;
    this.validateGeolocation(settings, input.geolocation, requiresGeo);

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        clockOut: null,
        deletedAt: null,
        status: "active",
      },
      select: {
        id: true,
        clockIn: true,
        shiftId: true,
      },
    });

    if (existingEntry) {
      throw new TimeEntryError(
        "ALREADY_CLOCKED_IN",
        "Already clocked in",
        400,
        {
          currentEntry: {
            id: existingEntry.id,
            clockIn: existingEntry.clockIn,
            shiftId: existingEntry.shiftId,
          },
        },
      );
    }

    let entryType: "scheduled" | "unscheduled" = "unscheduled";
    if (input.shiftId) {
      const shift = await prisma.shift.findFirst({
        where: {
          id: input.shiftId,
          tenantId,
          employeeId: employee.id,
          deletedAt: null,
        },
      });

      if (!shift) {
        throw new TimeEntryError(
          "INVALID_SHIFT",
          "Shift not found or not assigned to you",
        );
      }

      entryType = "scheduled";
    }

    const clockInTime = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.timeEntry.create({
        data: {
          tenantId,
          employeeId: employee.id,
          clockIn: clockInTime,
          shiftId: input.shiftId,
          entryType,
          clockInLat: input.geolocation?.latitude,
          clockInLng: input.geolocation?.longitude,
          notes: input.notes,
          status: "active",
          breakMinutes: 0,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: context.userId,
          userEmail: context.userEmail,
          action: "clock_in",
          resourceType: "time_entry",
          resourceId: entry.id,
          changesBefore: Prisma.DbNull,
          changesAfter: {
            clockIn: entry.clockIn,
            clockInLat: entry.clockInLat,
            clockInLng: entry.clockInLng,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            entryType,
            shiftId: entry.shiftId,
            geolocationAccuracy: input.geolocation?.accuracy,
          },
        },
      });

      return entry;
    });

    logger.info(
      { tenantId, employeeId: employee.id, timeEntryId: result.id },
      "Clock in recorded",
    );

    return result;
  }

  async clockOut(
    tenantId: string,
    userId: string,
    input: ClockOutInput,
    context: RequestContext,
  ) {
    const employee = await this.getEmployeeForUser(tenantId, userId);
    const settings = await this.getTenantSettings(tenantId);

    const requiresGeo =
      settings.geolocation.required || settings.geolocation.clockOutRequired;
    this.validateGeolocation(settings, input.geolocation, requiresGeo);

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        clockOut: null,
        deletedAt: null,
        status: "active",
      },
      orderBy: { clockIn: "desc" },
    });

    if (!existingEntry) {
      throw new TimeEntryError("NOT_CLOCKED_IN", "No active time entry found");
    }

    const clockOutTime = new Date();
    const totalMinutesRaw =
      (clockOutTime.getTime() - existingEntry.clockIn.getTime()) / 60000;
    const totalHoursRaw = totalMinutesRaw / 60;

    let breakMinutes = this.calculateAutoBreakMinutes(
      totalHoursRaw,
      settings.autoBreakRules,
    );

    if (input.breakMinutes !== undefined && settings.allowManualBreakOverride) {
      breakMinutes = input.breakMinutes;
    }

    if (breakMinutes < 0 || breakMinutes > totalMinutesRaw) {
      throw new TimeEntryError(
        "INVALID_BREAK_MINUTES",
        "Break minutes cannot exceed total time",
      );
    }

    const totalHours = (totalMinutesRaw - breakMinutes) / 60;
    const overtimeHours = Math.max(0, totalHours - settings.standardHours);

    const result = await prisma.$transaction(async (tx) => {
      const updatedEntry = await tx.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          clockOut: clockOutTime,
          clockOutLat: input.geolocation?.latitude,
          clockOutLng: input.geolocation?.longitude,
          breakMinutes,
          totalHours,
          overtimeHours,
          notes: input.notes ?? existingEntry.notes,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId: context.userId,
          userEmail: context.userEmail,
          action: "clock_out",
          resourceType: "time_entry",
          resourceId: updatedEntry.id,
          changesBefore: {
            clockOut: existingEntry.clockOut,
            breakMinutes: existingEntry.breakMinutes,
          },
          changesAfter: {
            clockOut: updatedEntry.clockOut,
            clockOutLat: updatedEntry.clockOutLat,
            clockOutLng: updatedEntry.clockOutLng,
            breakMinutes: updatedEntry.breakMinutes,
            totalHours: updatedEntry.totalHours,
            overtimeHours: updatedEntry.overtimeHours,
          },
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: {
            entryType: updatedEntry.entryType,
            shiftId: updatedEntry.shiftId,
            geolocationAccuracy: input.geolocation?.accuracy,
          },
        },
      });

      return updatedEntry;
    });

    logger.info(
      { tenantId, employeeId: employee.id, timeEntryId: result.id },
      "Clock out recorded",
    );

    return result;
  }

  async getCurrent(tenantId: string, userId: string) {
    const employee = await this.getEmployeeForUser(tenantId, userId);

    const entry = await prisma.timeEntry.findFirst({
      where: {
        tenantId,
        employeeId: employee.id,
        clockOut: null,
        deletedAt: null,
        status: "active",
      },
      include: {
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            role: true,
            location: true,
          },
        },
      },
      orderBy: { clockIn: "desc" },
    });

    if (!entry) {
      return null;
    }

    const elapsedMinutes = Math.floor(
      (Date.now() - entry.clockIn.getTime()) / 60000,
    );

    return {
      ...entry,
      elapsedMinutes,
    };
  }

  async getHistory(
    tenantId: string,
    params: {
      employeeId?: string;
      startDate?: Date;
      endDate?: Date;
      entryType?: "scheduled" | "unscheduled";
      status?: "active" | "corrected" | "deleted";
      page: number;
      limit: number;
      sortBy: "clockIn" | "clockOut" | "createdAt";
      sortOrder: "asc" | "desc";
    },
  ) {
    const where: any = { tenantId };

    if (params.employeeId) {
      where.employeeId = params.employeeId;
    }

    if (params.entryType) {
      where.entryType = params.entryType;
    }

    if (params.status) {
      where.status = params.status;
      if (params.status === "deleted") {
        where.deletedAt = { not: null };
      } else {
        where.deletedAt = null;
      }
    } else {
      where.deletedAt = null;
    }

    if (params.startDate || params.endDate) {
      where.AND = [];
      if (params.startDate) {
        where.AND.push({ clockIn: { gte: params.startDate } });
      }
      if (params.endDate) {
        where.AND.push({ clockIn: { lte: params.endDate } });
      }
    }

    const totalItems = await prisma.timeEntry.count({ where });
    const totalPages = Math.ceil(totalItems / params.limit) || 1;
    const skip = (params.page - 1) * params.limit;

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        shift: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            role: true,
            location: true,
          },
        },
      },
      orderBy: { [params.sortBy]: params.sortOrder },
      skip,
      take: params.limit,
    });

    return {
      entries,
      pagination: {
        page: params.page,
        limit: params.limit,
        totalItems,
        totalPages,
        hasNext: params.page < totalPages,
        hasPrev: params.page > 1,
      },
    };
  }

  async getStats(
    tenantId: string,
    params: {
      employeeId?: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    const where: any = {
      tenantId,
      clockIn: {
        gte: params.startDate,
        lte: params.endDate,
      },
      deletedAt: null,
    };

    if (params.employeeId) {
      where.employeeId = params.employeeId;
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      select: {
        clockIn: true,
        clockOut: true,
        breakMinutes: true,
        totalHours: true,
        overtimeHours: true,
        entryType: true,
      },
    });

    const totalMinutesRange =
      (params.endDate.getTime() - params.startDate.getTime()) / 60000;
    const totalDays = Math.max(
      1,
      Math.floor(totalMinutesRange / (60 * 24)) + 1,
    );

    const daysWorkedSet = new Set<string>();
    let totalHours = 0;
    let overtimeHours = 0;
    let breakHours = 0;
    let scheduledShifts = 0;
    let unscheduledShifts = 0;
    let missingClockOuts = 0;

    entries.forEach((entry) => {
      const dayKey = entry.clockIn.toISOString().slice(0, 10);
      daysWorkedSet.add(dayKey);

      if (!entry.clockOut) {
        missingClockOuts += 1;
        return;
      }

      const computedTotalHours =
        entry.totalHours !== null
          ? entry.totalHours
          : (entry.clockOut.getTime() - entry.clockIn.getTime()) / 3600000 -
            entry.breakMinutes / 60;

      const computedOvertimeHours =
        entry.overtimeHours !== null ? entry.overtimeHours : 0;

      totalHours += computedTotalHours;
      overtimeHours += computedOvertimeHours;
      breakHours += entry.breakMinutes / 60;

      if (entry.entryType === "scheduled") {
        scheduledShifts += 1;
      } else {
        unscheduledShifts += 1;
      }
    });

    const regularHours = Math.max(0, totalHours - overtimeHours);
    const daysWorked = daysWorkedSet.size;
    const averageHoursPerDay = daysWorked > 0 ? totalHours / daysWorked : 0;

    return {
      totalHours,
      regularHours,
      overtimeHours,
      breakHours,
      totalDays,
      daysWorked,
      scheduledShifts,
      unscheduledShifts,
      missingClockOuts,
      averageHoursPerDay,
    };
  }
}
