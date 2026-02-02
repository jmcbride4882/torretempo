import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "../utils/logger";
import { ConflictDetectionService } from "./conflict-detection.service";

const prisma = new PrismaClient();
const conflictService = new ConflictDetectionService();

interface CreateShiftInput {
  scheduleId: string;
  startTime: Date;
  endTime: Date;
  breakMinutes?: number;
  role?: string;
  location?: string;
  workCenter?: string;
  employeeId?: string;
  color?: string;
  notes?: string;
}

interface UpdateShiftInput {
  startTime?: Date;
  endTime?: Date;
  breakMinutes?: number;
  role?: string;
  location?: string;
  workCenter?: string;
  employeeId?: string;
  color?: string;
  notes?: string;
}

export class ShiftService {
  async getAllForSchedule(
    scheduleId: string,
    tenantId: string,
    filters?: {
      employeeId?: string;
      role?: string;
      hasConflicts?: boolean;
    },
  ) {
    const where: any = { scheduleId, tenantId, deletedAt: null };

    if (filters?.employeeId) {
      where.employeeId = filters.employeeId;
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.hasConflicts !== undefined) {
      where.hasConflicts = filters.hasConflicts;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: "asc" },
    });

    // Add employee name for easier frontend use
    return shifts.map((shift: any) => ({
      ...shift,
      employeeName: shift.employee
        ? `${shift.employee.user.firstName} ${shift.employee.user.lastName}`
        : null,
    }));
  }

  async getById(id: string, tenantId: string) {
    const shift = await prisma.shift.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        schedule: true,
      },
    });

    if (!shift) {
      throw new Error("Shift not found");
    }

    return shift;
  }

  async create(input: CreateShiftInput, tenantId: string) {
    // Verify schedule exists and is not locked
    const schedule = await prisma.schedule.findFirst({
      where: {
        id: input.scheduleId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    if (schedule.status === "locked") {
      throw new Error("Cannot create shifts in locked schedule");
    }

    // Validate shift timing
    if (input.startTime >= input.endTime) {
      throw new Error("Shift end time must be after start time");
    }

    const durationHours =
      (input.endTime.getTime() - input.startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 24) {
      throw new Error("Shift cannot exceed 24 hours");
    }

    // Create shift
    const shift = await prisma.shift.create({
      data: {
        tenantId,
        scheduleId: input.scheduleId,
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes || 0,
        role: input.role,
        location: input.location,
        workCenter: input.workCenter,
        employeeId: input.employeeId,
        assignmentStatus: input.employeeId ? "assigned" : "unassigned",
        color: input.color,
        notes: input.notes,
      },
    });

    logger.info(
      { shiftId: shift.id, scheduleId: input.scheduleId, tenantId },
      "Shift created",
    );

    // Run conflict detection
    const updatedShift = await this.detectAndUpdateConflicts(
      shift.id,
      tenantId,
    );

    return updatedShift;
  }

  async update(id: string, input: UpdateShiftInput, tenantId: string) {
    const existing = await this.getById(id, tenantId);

    if (existing.schedule.status === "locked") {
      throw new Error("Cannot update shifts in locked schedule");
    }

    // Validate timing if being updated
    if (input.startTime && input.endTime) {
      if (input.startTime >= input.endTime) {
        throw new Error("Shift end time must be after start time");
      }

      const durationHours =
        (input.endTime.getTime() - input.startTime.getTime()) /
        (1000 * 60 * 60);
      if (durationHours > 24) {
        throw new Error("Shift cannot exceed 24 hours");
      }
    }

    const shift = await prisma.shift.update({
      where: { id },
      data: {
        startTime: input.startTime,
        endTime: input.endTime,
        breakMinutes: input.breakMinutes,
        role: input.role,
        location: input.location,
        workCenter: input.workCenter,
        employeeId: input.employeeId,
        assignmentStatus: input.employeeId ? "assigned" : "unassigned",
        color: input.color,
        notes: input.notes,
      },
    });

    logger.info({ shiftId: id, tenantId }, "Shift updated");

    // Re-run conflict detection
    const updatedShift = await this.detectAndUpdateConflicts(id, tenantId);

    return updatedShift;
  }

  async delete(id: string, tenantId: string) {
    const existing = await this.getById(id, tenantId);

    if (existing.schedule.status === "locked") {
      throw new Error("Cannot delete shifts in locked schedule");
    }

    await prisma.shift.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info({ shiftId: id, tenantId }, "Shift soft deleted");

    return { success: true, message: "Shift deleted" };
  }

  async duplicate(
    id: string,
    tenantId: string,
    targetDate: Date,
    preserveAssignment: boolean = true,
  ) {
    const sourceShift = await this.getById(id, tenantId);

    if (sourceShift.schedule.status === "locked") {
      throw new Error("Cannot duplicate shifts from locked schedule");
    }

    // Calculate time offset
    const sourceStart = new Date(sourceShift.startTime);
    const targetStart = new Date(targetDate);
    targetStart.setHours(
      sourceStart.getHours(),
      sourceStart.getMinutes(),
      0,
      0,
    );

    const sourceEnd = new Date(sourceShift.endTime);
    const targetEnd = new Date(targetDate);
    targetEnd.setHours(sourceEnd.getHours(), sourceEnd.getMinutes(), 0, 0);

    // If shift spans multiple days, adjust end date
    if (sourceEnd < sourceStart) {
      targetEnd.setDate(targetEnd.getDate() + 1);
    }

    const newShift = await prisma.shift.create({
      data: {
        tenantId,
        scheduleId: sourceShift.scheduleId,
        startTime: targetStart,
        endTime: targetEnd,
        breakMinutes: sourceShift.breakMinutes,
        role: sourceShift.role,
        location: sourceShift.location,
        workCenter: sourceShift.workCenter,
        employeeId: preserveAssignment ? sourceShift.employeeId : null,
        assignmentStatus:
          preserveAssignment && sourceShift.employeeId
            ? "assigned"
            : "unassigned",
        color: sourceShift.color,
        notes: sourceShift.notes,
      },
    });

    logger.info(
      { shiftId: id, newShiftId: newShift.id, tenantId, targetDate },
      "Shift duplicated",
    );

    // Run conflict detection
    const updatedShift = await this.detectAndUpdateConflicts(
      newShift.id,
      tenantId,
    );

    return updatedShift;
  }

  private async detectAndUpdateConflicts(shiftId: string, tenantId: string) {
    const shift = await this.getById(shiftId, tenantId);

    if (!shift.employeeId) {
      // Unassigned shifts have no conflicts
      return shift;
    }

    // Get all shifts for this employee in the same schedule
    const employeeShifts = await prisma.shift.findMany({
      where: {
        tenantId,
        scheduleId: shift.scheduleId,
        employeeId: shift.employeeId,
        deletedAt: null,
      },
      orderBy: { startTime: "asc" },
    });

    // Detect conflicts
    const conflicts = conflictService.detectConflicts(shift, employeeShifts);

    // Update shift with conflict details
    const updated = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        hasConflicts: conflicts.length > 0,
        conflictDetails: (conflicts.length > 0 ? conflicts : []) as any,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return updated;
  }

  async getAllConflictsForSchedule(scheduleId: string, tenantId: string) {
    const shifts = await prisma.shift.findMany({
      where: {
        tenantId,
        scheduleId,
        deletedAt: null,
        hasConflicts: true,
      },
      include: {
        employee: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const conflicts = shifts.map((shift: any) => ({
      shiftId: shift.id,
      employeeId: shift.employeeId,
      employeeName: shift.employee
        ? `${shift.employee.user.firstName} ${shift.employee.user.lastName}`
        : null,
      conflicts: shift.conflictDetails,
    }));

    return {
      conflicts,
      totalConflicts: conflicts.reduce(
        (sum: number, c: any) => sum + (c.conflicts?.length || 0),
        0,
      ),
      canPublish: conflicts.length === 0,
    };
  }
}
