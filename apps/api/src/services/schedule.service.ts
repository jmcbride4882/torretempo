import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

interface CreateScheduleInput {
  title: string;
  startDate: Date;
  endDate: Date;
  departmentId?: string;
  location?: string;
  notes?: string;
}

interface UpdateScheduleInput {
  title?: string;
  startDate?: Date;
  endDate?: Date;
  departmentId?: string;
  location?: string;
  notes?: string;
}

export class ScheduleService {
  async getAll(
    tenantId: string,
    filters?: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      departmentId?: string;
    },
  ) {
    const where: any = { tenantId, deletedAt: null };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.departmentId) {
      where.departmentId = filters.departmentId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.AND = [];
      if (filters.startDate) {
        where.AND.push({ endDate: { gte: filters.startDate } });
      }
      if (filters.endDate) {
        where.AND.push({ startDate: { lte: filters.endDate } });
      }
    }

    const schedules = await prisma.schedule.findMany({
      where,
      include: {
        shifts: {
          where: { deletedAt: null },
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
        },
      },
      orderBy: { startDate: "desc" },
    });

    // Add computed fields
    return schedules.map((schedule: any) => ({
      ...schedule,
      shiftCount: schedule.shifts.length,
      conflictCount: schedule.shifts.filter((s: any) => s.hasConflicts).length,
    }));
  }

  async getById(id: string, tenantId: string) {
    const schedule = await prisma.schedule.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        shifts: {
          where: { deletedAt: null },
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
        },
      },
    });

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    return {
      ...schedule,
      shiftCount: schedule.shifts.length,
      conflictCount: schedule.shifts.filter((s: any) => s.hasConflicts).length,
    };
  }

  async create(input: CreateScheduleInput, tenantId: string, userId: string) {
    // Check for overlapping published schedules
    const overlapping = await prisma.schedule.findFirst({
      where: {
        tenantId,
        status: "published",
        deletedAt: null,
        OR: [
          {
            AND: [
              { startDate: { lte: input.startDate } },
              { endDate: { gte: input.startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: input.endDate } },
              { endDate: { gte: input.endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: input.startDate } },
              { endDate: { lte: input.endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new Error(
        "A published schedule already exists for overlapping dates",
      );
    }

    const schedule = await prisma.schedule.create({
      data: {
        tenantId,
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        departmentId: input.departmentId,
        location: input.location,
        notes: input.notes,
        status: "draft",
        createdBy: userId,
      },
      include: {
        shifts: true,
      },
    });

    logger.info({ scheduleId: schedule.id, tenantId }, "Schedule created");

    return schedule;
  }

  async update(id: string, input: UpdateScheduleInput, tenantId: string) {
    const existing = await this.getById(id, tenantId);

    if (existing.status === "locked") {
      throw new Error("Cannot update locked schedule. Unlock it first.");
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        title: input.title,
        startDate: input.startDate,
        endDate: input.endDate,
        departmentId: input.departmentId,
        location: input.location,
        notes: input.notes,
      },
      include: {
        shifts: {
          where: { deletedAt: null },
        },
      },
    });

    logger.info({ scheduleId: id, tenantId }, "Schedule updated");

    return schedule;
  }

  async delete(id: string, tenantId: string) {
    const existing = await this.getById(id, tenantId);

    if (existing.status === "published" || existing.status === "locked") {
      throw new Error("Cannot delete published or locked schedule");
    }

    await prisma.schedule.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    logger.info({ scheduleId: id, tenantId }, "Schedule soft deleted");

    return { success: true, message: "Schedule deleted" };
  }

  async publish(id: string, tenantId: string, userId: string) {
    const schedule = await this.getById(id, tenantId);

    if (schedule.status !== "draft") {
      throw new Error("Only draft schedules can be published");
    }

    // Check for conflicts
    const conflictCount = schedule.shifts.filter(
      (s: any) => s.hasConflicts,
    ).length;
    if (conflictCount > 0) {
      throw new Error(
        `Cannot publish schedule with ${conflictCount} unresolved conflicts`,
      );
    }

    // Check for overlapping published schedules
    const overlapping = await prisma.schedule.findFirst({
      where: {
        tenantId,
        status: "published",
        deletedAt: null,
        id: { not: id },
        OR: [
          {
            AND: [
              { startDate: { lte: schedule.startDate } },
              { endDate: { gte: schedule.startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: schedule.endDate } },
              { endDate: { gte: schedule.endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: schedule.startDate } },
              { endDate: { lte: schedule.endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new Error(
        "Another published schedule exists for overlapping dates",
      );
    }

    const published = await prisma.schedule.update({
      where: { id },
      data: {
        status: "published",
        publishedAt: new Date(),
        publishedBy: userId,
      },
    });

    logger.info({ scheduleId: id, tenantId }, "Schedule published");

    // TODO: Send notifications to employees with assigned shifts

    return {
      schedule: published,
      notificationsSent: schedule.shifts.filter((s: any) => s.employeeId)
        .length,
    };
  }

  async unpublish(id: string, tenantId: string, userId: string) {
    const schedule = await this.getById(id, tenantId);

    if (schedule.status !== "published") {
      throw new Error("Only published schedules can be unpublished");
    }

    const unpublished = await prisma.schedule.update({
      where: { id },
      data: {
        status: "draft",
        publishedAt: null,
        publishedBy: null,
      },
    });

    logger.info({ scheduleId: id, tenantId, userId }, "Schedule unpublished");

    return unpublished;
  }

  async lock(id: string, tenantId: string, userId: string, reason?: string) {
    const schedule = await this.getById(id, tenantId);

    if (schedule.status !== "published") {
      throw new Error("Only published schedules can be locked");
    }

    const locked = await prisma.schedule.update({
      where: { id },
      data: {
        status: "locked",
        lockedAt: new Date(),
        lockedBy: userId,
        unlockReason: reason,
      },
    });

    logger.info({ scheduleId: id, tenantId, reason }, "Schedule locked");

    return locked;
  }

  async unlock(id: string, tenantId: string, reason: string) {
    const schedule = await this.getById(id, tenantId);

    if (schedule.status !== "locked") {
      throw new Error("Only locked schedules can be unlocked");
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("Unlock reason is required");
    }

    const unlocked = await prisma.schedule.update({
      where: { id },
      data: {
        status: "published",
        lockedAt: null,
        lockedBy: null,
        unlockReason: reason,
      },
    });

    logger.info({ scheduleId: id, tenantId, reason }, "Schedule unlocked");

    return unlocked;
  }

  async copy(
    id: string,
    tenantId: string,
    userId: string,
    targetStartDate: Date,
    targetEndDate: Date,
    copyAssignments: boolean = true,
  ) {
    const sourceSchedule = await this.getById(id, tenantId);

    // Create new schedule
    const newSchedule = await prisma.schedule.create({
      data: {
        tenantId,
        title: `${sourceSchedule.title} (copied)`,
        startDate: targetStartDate,
        endDate: targetEndDate,
        departmentId: sourceSchedule.departmentId,
        location: sourceSchedule.location,
        notes: sourceSchedule.notes,
        status: "draft",
        createdBy: userId,
        metadata: {
          copiedFromScheduleId: id,
        },
      },
    });

    // Calculate date offset
    const sourceStart = sourceSchedule.startDate.getTime();
    const targetStart = targetStartDate.getTime();
    const dateOffset = targetStart - sourceStart;

    // Copy shifts
    const newShifts = await Promise.all(
      sourceSchedule.shifts.map(async (shift: any) => {
        const newStartTime = new Date(shift.startTime.getTime() + dateOffset);
        const newEndTime = new Date(shift.endTime.getTime() + dateOffset);

        return prisma.shift.create({
          data: {
            tenantId,
            scheduleId: newSchedule.id,
            startTime: newStartTime,
            endTime: newEndTime,
            breakMinutes: shift.breakMinutes,
            role: shift.role,
            location: shift.location,
            workCenter: shift.workCenter,
            employeeId: copyAssignments ? shift.employeeId : null,
            assignmentStatus:
              copyAssignments && shift.employeeId ? "assigned" : "unassigned",
            color: shift.color,
            notes: shift.notes,
            metadata: shift.metadata,
          },
        });
      }),
    );

    logger.info(
      {
        scheduleId: id,
        newScheduleId: newSchedule.id,
        tenantId,
        shiftsCopied: newShifts.length,
      },
      "Schedule copied",
    );

    // Re-run conflict detection on new shifts
    // TODO: Implement conflict detection service and run it here

    return {
      ...newSchedule,
      shiftCount: newShifts.length,
      conflictCount: 0, // Will be updated after conflict detection
    };
  }
}
