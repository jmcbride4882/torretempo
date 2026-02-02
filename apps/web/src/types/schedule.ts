// Schedule types for Torre Tempo Scheduling Module

export type ScheduleStatus = "draft" | "published" | "locked";

export type AssignmentStatus =
  | "unassigned"
  | "assigned"
  | "accepted"
  | "declined"
  | "swapped";

export type ConflictSeverity = "error" | "warning" | "info";

export type ConflictType =
  | "overlap"
  | "rest_period"
  | "availability"
  | "max_hours_daily"
  | "max_hours_weekly"
  | "skill_mismatch";

export interface Conflict {
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  conflictingShiftId?: string;
}

export interface Schedule {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  departmentId?: string;
  location?: string;
  notes?: string;
  publishedAt?: string;
  publishedBy?: string;
  lockedAt?: string;
  lockedBy?: string;
  unlockReason?: string;
  shiftCount?: number;
  conflictCount?: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  scheduleId: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  role?: string;
  location?: string;
  workCenter?: string;
  employeeId?: string;
  employeeName?: string;
  assignmentStatus: AssignmentStatus;
  hasConflicts: boolean;
  conflictDetails?: Conflict[];
  color?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftConflict {
  shiftId: string;
  employeeId: string;
  employeeName: string;
  conflicts: Conflict[];
}

export interface ScheduleConflictsResponse {
  conflicts: ShiftConflict[];
  totalConflicts: number;
  canPublish: boolean;
}

// Input types for API calls
export interface CreateScheduleInput {
  title: string;
  startDate: string;
  endDate: string;
  departmentId?: string;
  location?: string;
  notes?: string;
}

export interface UpdateScheduleInput {
  title?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  location?: string;
  notes?: string;
}

export interface CreateShiftInput {
  startTime: string;
  endTime: string;
  breakMinutes?: number;
  role?: string;
  location?: string;
  workCenter?: string;
  employeeId?: string;
  color?: string;
  notes?: string;
}

export interface UpdateShiftInput {
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  role?: string;
  location?: string;
  workCenter?: string;
  employeeId?: string;
  color?: string;
  notes?: string;
}

export interface CopyScheduleInput {
  targetStartDate: string;
  targetEndDate: string;
  copyAssignments?: boolean;
}

export interface LockScheduleInput {
  reason?: string;
}

export interface UnlockScheduleInput {
  reason: string;
}

export interface DuplicateShiftInput {
  targetDate: string;
  preserveAssignment?: boolean;
}

// Query params for filtering
export interface ScheduleFilters {
  status?: ScheduleStatus;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
}

export interface ShiftFilters {
  employeeId?: string;
  role?: string;
  hasConflicts?: boolean;
}

// Calendar event type (for react-big-calendar)
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string; // employeeId for resource view
  shift: Shift;
}
