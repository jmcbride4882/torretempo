import type { Shift } from "./schedule";
import type { Employee } from "./employee";

export interface ShiftSwapRequest {
  id: string;
  tenantId: string;
  shiftId: string;
  requestedBy: string; // Employee ID
  requestedTo: string; // Employee ID
  targetShiftId?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  reason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Populated relations
  shift?: Shift & {
    employee?: Employee;
    schedule?: {
      id: string;
      title: string;
      startDate: string;
      endDate: string;
    };
  };
  targetShift?: Shift & {
    employee?: Employee;
    schedule?: {
      id: string;
      title: string;
      startDate: string;
      endDate: string;
    };
  };
  requester?: Employee;
  requestee?: Employee;
}

export interface CreateShiftSwapInput {
  shiftId: string;
  requestedTo?: string; // Employee ID (optional if broadcasting)
  targetShiftId?: string;
  reason?: string;
  notes?: string;
  broadcastToRole?: boolean; // If true, broadcast to all employees with same role
}

export interface ApproveShiftSwapInput {
  // Manager approval - no additional fields needed
}

export interface RejectShiftSwapInput {
  rejectionReason: string;
}

export interface CancelShiftSwapInput {
  // Employee cancellation - no additional fields needed
}

export interface ShiftSwapFilters {
  status?: "pending" | "approved" | "rejected" | "cancelled";
  shiftId?: string;
}
