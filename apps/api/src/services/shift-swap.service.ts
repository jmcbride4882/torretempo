import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateShiftSwapInput {
  shiftId: string;
  requestedBy: string; // Employee ID
  requestedTo: string; // Employee ID
  targetShiftId?: string; // Optional: if swapping with another specific shift
  reason?: string;
  notes?: string;
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
 * Create a new shift swap request
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
