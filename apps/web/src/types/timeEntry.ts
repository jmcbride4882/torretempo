// Time Entry types for Torre Tempo Time Tracking Module

export type TimeEntryStatus = "active" | "completed" | "corrected" | "deleted";
export type EntryType = "scheduled" | "unscheduled";

export interface Geolocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: string;
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  employee?: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  clockIn: string;
  clockOut: string | null;
  shiftId: string | null;
  shift?: {
    id: string;
    startTime: string;
    endTime: string;
    role: string | null;
    location: string | null;
  } | null;
  entryType: EntryType;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutLat: number | null;
  clockOutLng: number | null;
  breakMinutes: number;
  breakStart: string | null; // Timestamp when employee started current break
  totalHours: number | null;
  overtimeHours: number | null;
  status: TimeEntryStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed fields from API (current entry only)
  elapsedMinutes?: number;
  // Computed fields for UI (geocoded addresses)
  clockInAddress?: string;
  clockOutAddress?: string;
}

export interface TimeEntryStats {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  breakHours: number;
  totalDays: number;
  daysWorked: number;
  scheduledShifts: number;
  unscheduledShifts: number;
  missingClockOuts: number;
  averageHoursPerDay: number;
}

export interface TimeEntryPagination {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TimeEntryHistoryResponse {
  entries: TimeEntry[];
  pagination: TimeEntryPagination;
}

// Input types for API calls
export interface ClockInInput {
  shiftId?: string;
  geolocation?: Geolocation;
  notes?: string;
  forceOverride?: boolean; // Override early clock-in warning
}

export interface ClockOutInput {
  geolocation?: Geolocation;
  breakMinutes?: number;
  notes?: string;
}

// Query params for history
export interface TimeEntryFilters {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  entryType?: EntryType;
  status?: TimeEntryStatus;
  page?: number;
  limit?: number;
  sortBy?: "clockIn" | "clockOut" | "createdAt";
  sortOrder?: "asc" | "desc";
}

export interface TimeEntryStatsFilters {
  employeeId?: string;
  startDate: string;
  endDate: string;
}

// Error response types
export interface AlreadyClockedInError {
  error: string;
  code: "ALREADY_CLOCKED_IN";
  currentEntry: {
    id: string;
    clockIn: string;
    shiftId: string | null;
  };
}

export interface EarlyClockInWarning {
  error: string;
  code: "EARLY_CLOCK_IN_WARNING";
  minutesUntilStart: number;
  shiftStart: string;
  thresholdMinutes: number;
  canOverride: boolean;
}

export interface TimeEntryApiError {
  error: string;
  code: string;
  currentEntry?: {
    id: string;
    clockIn: string;
    shiftId: string | null;
  };
  minutesUntilStart?: number;
  shiftStart?: string;
  thresholdMinutes?: number;
  canOverride?: boolean;
}
