import { PrismaClient, Prisma } from "@prisma/client";
import { emailService } from "./email.service";
import { oneSignalService } from "./onesignal.service";
import { format } from "date-fns";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

export interface CreateShiftSwapInput {
  shiftId: string;
  requestedBy: string; // Employee ID
  requestedTo?: string; // Employee ID (optional if broadcasting)
  targetShiftId?: string; // Optional: if swapping with another specific shift
  reason?: string;
  notes?: string;
  broadcastToRole?: boolean; // If true, broadcast to all employees with same role
}

export interface ApproveShiftSwapInput {
  approvedBy: string; // Manager/Admin user ID
}

export interface RejectShiftSwapInput {
  rejectedBy: string; // Manager/Admin user ID
  rejectionReason: string;
}

export interface CancelShiftSwapInput {
  cancelledBy: string; // Employee user ID
}

export interface GetAllSwapRequestsFilters {
  status?: string; // 'pending', 'approved', 'rejected', 'cancelled'
  employeeId?: string; // Filter by requester or requestee
  shiftId?: string;
}

/**
 * Send email notification to requestee about new swap request
 */
async function sendSwapRequestEmail(
  tenantId: string,
  swapRequest: any,
): Promise<void> {
  try {
    const requestee = swapRequest.requestee;
    const requester = swapRequest.requester;
    const shift = swapRequest.shift;

    if (!requestee?.user?.email || !requester?.user) {
      logger.warn(
        { swapRequestId: swapRequest.id },
        "Cannot send swap request email: missing user data",
      );
      return;
    }

    // Get requestee's preferred language (default to Spanish)
    const language = requestee.user.preferredLanguage || "es";

    // Format shift date and time
    const shiftStart = new Date(shift.startTime);
    const shiftEnd = new Date(shift.endTime);
    const shiftDate = format(shiftStart, "EEEE, d MMMM yyyy");
    const shiftTime = `${format(shiftStart, "HH:mm")} - ${format(shiftEnd, "HH:mm")}`;

    // Get app URL
    const appUrl = process.env.APP_URL || "https://time.lsltgroup.es";

    // Prepare email variables
    const variables = {
      requesteeName: requestee.user.firstName,
      requesterName: `${requester.user.firstName} ${requester.user.lastName}`,
      shiftDate,
      shiftTime,
      shiftRole: shift.role || "",
      shiftLocation: shift.location || "",
      reason: swapRequest.reason || "",
      appUrl,
    };

    // Send email asynchronously (don't await to avoid blocking)
    const subject =
      language === "es"
        ? "Solicitud de Intercambio de Turno"
        : "Shift Swap Request";

    emailService
      .sendEmail(tenantId, {
        to: requestee.user.email,
        subject,
        template: "shift-swap-request",
        language,
        variables,
      })
      .catch((error: unknown) => {
        logger.error(
          { error, swapRequestId: swapRequest.id },
          "Failed to send swap request email",
        );
      });

    logger.info(
      {
        swapRequestId: swapRequest.id,
        to: requestee.user.email,
      },
      "Swap request email queued",
    );

    // Send push notification if user has OneSignal player ID
    if (requestee.user.oneSignalPlayerId) {
      const notificationTitle =
        language === "es"
          ? "Nueva Solicitud de Intercambio de Turno"
          : "New Shift Swap Request";
      const notificationMessage =
        language === "es"
          ? `${requester.user.firstName} ${requester.user.lastName} quiere intercambiar turnos`
          : `${requester.user.firstName} ${requester.user.lastName} wants to swap shifts`;

      // Send notification asynchronously (don't await to avoid blocking)
      oneSignalService
        .sendNotification(
          [requestee.user.oneSignalPlayerId],
          notificationTitle,
          notificationMessage,
          {
            type: "shift_swap_request",
            swapRequestId: swapRequest.id,
            shiftId: shift.id,
            requesterId: requester.id,
          },
        )
        .catch((error: unknown) => {
          logger.error(
            { error, swapRequestId: swapRequest.id },
            "Failed to send swap request push notification",
          );
        });

      logger.info(
        {
          swapRequestId: swapRequest.id,
          playerId: requestee.user.oneSignalPlayerId,
        },
        "Swap request push notification queued",
      );
    }
  } catch (error: unknown) {
    logger.error(
      { error, swapRequestId: swapRequest.id },
      "Error preparing swap request email",
    );
  }
}

/**
 * Create a new shift swap request (or multiple if broadcasting)
 */
export async function create(tenantId: string, input: CreateShiftSwapInput) {
  // Validate that the shift exists and belongs to the tenant
  const shift = await prisma.shift.findFirst({
    where: {
      id: input.shiftId,
      tenantId,
    },
  });

  if (!shift) {
    throw new Error("Shift not found or does not belong to this tenant");
  }

  // Validate that requester owns the shift
  if (shift.employeeId !== input.requestedBy) {
    throw new Error("Only the assigned employee can request a swap");
  }

  // If broadcasting to role
  if (input.broadcastToRole) {
    // Validate shift has a role
    if (!shift.role) {
      throw new Error(
        "Cannot broadcast swap request: shift has no role assigned",
      );
    }

    // Find all active employees with the same role (excluding the requester)
    const employeesWithRole = await prisma.employee.findMany({
      where: {
        tenantId,
        status: "active",
        id: { not: input.requestedBy },
        position: shift.role, // Match position to shift role
      },
      include: {
        user: true,
      },
    });

    if (employeesWithRole.length === 0) {
      throw new Error(`No active employees found with role: ${shift.role}`);
    }

    // Create swap requests for all matching employees
    const swapRequests = await Promise.all(
      employeesWithRole.map((employee) =>
        prisma.shiftSwapRequest.create({
          data: {
            tenantId,
            shiftId: input.shiftId,
            requestedBy: input.requestedBy,
            requestedTo: employee.id,
            targetShiftId: input.targetShiftId,
            reason: input.reason,
            notes: input.notes,
            status: "pending",
          },
          include: {
            shift: {
              include: {
                employee: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            targetShift: {
              include: {
                employee: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            requester: {
              include: {
                user: true,
              },
            },
            requestee: {
              include: {
                user: true,
              },
            },
          },
        }),
      ),
    );

    // Send email notifications to all requestees (async, don't block)
    swapRequests.forEach((swapRequest) => {
      sendSwapRequestEmail(tenantId, swapRequest);
    });

    // Return the first one (for compatibility), but all are created
    return swapRequests[0];
  }

  // Single employee swap request
  if (!input.requestedTo) {
    throw new Error("requestedTo is required when not broadcasting");
  }

  // Validate that requestee exists and belongs to the tenant
  const requestee = await prisma.employee.findFirst({
    where: {
      id: input.requestedTo,
      tenantId,
      status: "active",
    },
  });

  if (!requestee) {
    throw new Error("Requested employee not found or not active");
  }

  // If target shift is specified, validate it exists and belongs to requestee
  if (input.targetShiftId) {
    const targetShift = await prisma.shift.findFirst({
      where: {
        id: input.targetShiftId,
        tenantId,
        employeeId: input.requestedTo,
      },
    });

    if (!targetShift) {
      throw new Error(
        "Target shift not found or does not belong to requested employee",
      );
    }
  }

  // Create the swap request
  const swapRequest = await prisma.shiftSwapRequest.create({
    data: {
      tenantId,
      shiftId: input.shiftId,
      requestedBy: input.requestedBy,
      requestedTo: input.requestedTo,
      targetShiftId: input.targetShiftId,
      reason: input.reason,
      notes: input.notes,
      status: "pending",
    },
    include: {
      shift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
      },
      targetShift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
        },
      },
      requester: {
        include: {
          user: true,
        },
      },
      requestee: {
        include: {
          user: true,
        },
      },
    },
  });

  // Send email notification to requestee (async, don't block)
  sendSwapRequestEmail(tenantId, swapRequest);

  return swapRequest;
}

/**
 * Get all swap requests for a tenant with optional filters
 */
export async function getAll(
  tenantId: string,
  filters?: GetAllSwapRequestsFilters,
) {
  const where: any = {
    tenantId,
    deletedAt: null,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.employeeId) {
    where.OR = [
      { requestedBy: filters.employeeId },
      { requestedTo: filters.employeeId },
    ];
  }

  if (filters?.shiftId) {
    where.OR = where.OR || [];
    where.OR.push(
      { shiftId: filters.shiftId },
      { targetShiftId: filters.shiftId },
    );
  }

  const swapRequests = await prisma.shiftSwapRequest.findMany({
    where,
    include: {
      shift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      targetShift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      requester: {
        include: {
          user: true,
        },
      },
      requestee: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return swapRequests;
}

/**
 * Get a single swap request by ID
 */
export async function getById(tenantId: string, id: string) {
  const swapRequest = await prisma.shiftSwapRequest.findFirst({
    where: {
      id,
      tenantId,
      deletedAt: null,
    },
    include: {
      shift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      targetShift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      requester: {
        include: {
          user: true,
        },
      },
      requestee: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!swapRequest) {
    throw new Error("Swap request not found");
  }

  return swapRequest;
}

/**
 * Get swap requests for a specific employee (requested by or to them)
 */
export async function getByEmployee(tenantId: string, employeeId: string) {
  const swapRequests = await prisma.shiftSwapRequest.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [{ requestedBy: employeeId }, { requestedTo: employeeId }],
    },
    include: {
      shift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      targetShift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      requester: {
        include: {
          user: true,
        },
      },
      requestee: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return swapRequests;
}

/**
 * Approve a swap request (manager only)
 * This will swap the employeeId on both shifts
 */
export async function approve(
  tenantId: string,
  id: string,
  input: ApproveShiftSwapInput,
) {
  const swapRequest = await getById(tenantId, id);

  if (swapRequest.status !== "pending") {
    throw new Error("Only pending swap requests can be approved");
  }

  // Start a transaction to swap the shifts and update the request
  const result = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Get the original shift
      const originalShift = await tx.shift.findUnique({
        where: { id: swapRequest.shiftId },
      });

      if (!originalShift) {
        throw new Error("Original shift not found");
      }

      // If there's a target shift (two-way swap), swap both
      if (swapRequest.targetShiftId) {
        const targetShift = await tx.shift.findUnique({
          where: { id: swapRequest.targetShiftId },
        });

        if (!targetShift) {
          throw new Error("Target shift not found");
        }

        // Swap the employee assignments
        await tx.shift.update({
          where: { id: originalShift.id },
          data: { employeeId: targetShift.employeeId },
        });

        await tx.shift.update({
          where: { id: targetShift.id },
          data: { employeeId: originalShift.employeeId },
        });
      } else {
        // One-way swap: just reassign the original shift to the requestee
        await tx.shift.update({
          where: { id: originalShift.id },
          data: { employeeId: swapRequest.requestedTo },
        });
      }

      // Update the swap request status
      const updated = await tx.shiftSwapRequest.update({
        where: { id },
        data: {
          status: "approved",
          approvedBy: input.approvedBy,
          approvedAt: new Date(),
        },
        include: {
          shift: {
            include: {
              employee: {
                include: {
                  user: true,
                },
              },
              schedule: true,
            },
          },
          targetShift: {
            include: {
              employee: {
                include: {
                  user: true,
                },
              },
              schedule: true,
            },
          },
          requester: {
            include: {
              user: true,
            },
          },
          requestee: {
            include: {
              user: true,
            },
          },
        },
      });

      return updated;
    },
  );

  return result;
}

/**
 * Reject a swap request (manager only)
 */
export async function reject(
  tenantId: string,
  id: string,
  input: RejectShiftSwapInput,
) {
  const swapRequest = await getById(tenantId, id);

  if (swapRequest.status !== "pending") {
    throw new Error("Only pending swap requests can be rejected");
  }

  const updated = await prisma.shiftSwapRequest.update({
    where: { id },
    data: {
      status: "rejected",
      rejectedBy: input.rejectedBy,
      rejectedAt: new Date(),
      rejectionReason: input.rejectionReason,
    },
    include: {
      shift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      targetShift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      requester: {
        include: {
          user: true,
        },
      },
      requestee: {
        include: {
          user: true,
        },
      },
    },
  });

  return updated;
}

/**
 * Cancel a swap request (requester only)
 */
export async function cancel(
  tenantId: string,
  id: string,
  input: CancelShiftSwapInput,
) {
  const swapRequest = await getById(tenantId, id);

  if (swapRequest.status !== "pending") {
    throw new Error("Only pending swap requests can be cancelled");
  }

  // Validate that the requester is cancelling their own request
  if (swapRequest.requestedBy !== input.cancelledBy) {
    throw new Error("Only the requester can cancel a swap request");
  }

  const updated = await prisma.shiftSwapRequest.update({
    where: { id },
    data: {
      status: "cancelled",
      cancelledBy: input.cancelledBy,
      cancelledAt: new Date(),
    },
    include: {
      shift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      targetShift: {
        include: {
          employee: {
            include: {
              user: true,
            },
          },
          schedule: true,
        },
      },
      requester: {
        include: {
          user: true,
        },
      },
      requestee: {
        include: {
          user: true,
        },
      },
    },
  });

  return updated;
}
