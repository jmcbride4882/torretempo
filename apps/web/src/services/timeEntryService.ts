import apiClient from "./api";
import type {
  TimeEntry,
  TimeEntryStats,
  TimeEntryHistoryResponse,
  ClockInInput,
  ClockOutInput,
  TimeEntryFilters,
  TimeEntryStatsFilters,
  Geolocation,
} from "../types/timeEntry";

export const timeEntryService = {
  /**
   * Clock in - Start a new time entry
   */
  async clockIn(input?: ClockInInput): Promise<TimeEntry> {
    const response = await apiClient.post(
      "/time-entries/clock-in",
      input || {},
    );
    return response.data.data;
  },

  /**
   * Clock out - End the active time entry
   */
  async clockOut(input?: ClockOutInput): Promise<TimeEntry> {
    const response = await apiClient.post(
      "/time-entries/clock-out",
      input || {},
    );
    return response.data.data;
  },

  /**
   * Get current active time entry (if any)
   */
  async getCurrent(): Promise<TimeEntry | null> {
    const response = await apiClient.get("/time-entries/current");
    return response.data.data;
  },

  /**
   * Get time entry history with pagination and filters
   */
  async getHistory(
    filters?: TimeEntryFilters,
  ): Promise<TimeEntryHistoryResponse> {
    const params = new URLSearchParams();

    if (filters?.employeeId) params.append("employeeId", filters.employeeId);
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.entryType) params.append("entryType", filters.entryType);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    if (filters?.sortBy) params.append("sortBy", filters.sortBy);
    if (filters?.sortOrder) params.append("sortOrder", filters.sortOrder);

    const queryString = params.toString();
    const url = `/time-entries${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get(url);
    return response.data.data;
  },

  /**
   * Get time tracking statistics for a period
   */
  async getStats(filters: TimeEntryStatsFilters): Promise<TimeEntryStats> {
    const params = new URLSearchParams();

    params.append("startDate", filters.startDate);
    params.append("endDate", filters.endDate);
    if (filters.employeeId) params.append("employeeId", filters.employeeId);

    const queryString = params.toString();
    const response = await apiClient.get(`/time-entries/stats?${queryString}`);
    return response.data.data;
  },

  /**
   * Get time entry by ID
   */
  async getById(id: string): Promise<TimeEntry> {
    const response = await apiClient.get(`/time-entries/${id}`);
    return response.data.data;
  },
};

// ============================================================================
// GEOLOCATION UTILITIES
// ============================================================================

export interface GeolocationState {
  position: Geolocation | null;
  error: string | null;
  loading: boolean;
  permissionDenied: boolean;
}

/**
 * Get current geolocation from browser
 */
export function getCurrentPosition(): Promise<Geolocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date().toISOString(),
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("PERMISSION_DENIED"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("POSITION_UNAVAILABLE"));
            break;
          case error.TIMEOUT:
            reject(new Error("TIMEOUT"));
            break;
          default:
            reject(new Error("UNKNOWN_ERROR"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000, // Cache for 1 minute
      },
    );
  });
}

/**
 * Check if geolocation permission is granted
 */
export async function checkGeolocationPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  if (!navigator.permissions) {
    return "prompt";
  }

  try {
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state;
  } catch {
    return "prompt";
  }
}

// ============================================================================
// OFFLINE SUPPORT (PWA)
// ============================================================================

const PENDING_ACTIONS_KEY = "tt_pending_time_entries";

interface PendingAction {
  id: string;
  type: "clock-in" | "clock-out";
  payload: ClockInInput | ClockOutInput;
  timestamp: string;
}

/**
 * Queue action for later sync (offline mode)
 */
export function queueOfflineAction(
  type: "clock-in" | "clock-out",
  payload: ClockInInput | ClockOutInput,
): void {
  const pending = getPendingActions();
  const action: PendingAction = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
  pending.push(action);
  localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(pending));
}

/**
 * Get pending offline actions
 */
export function getPendingActions(): PendingAction[] {
  const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Clear pending actions after successful sync
 */
export function clearPendingActions(): void {
  localStorage.removeItem(PENDING_ACTIONS_KEY);
}

/**
 * Sync pending offline actions with server
 */
export async function syncPendingActions(): Promise<void> {
  const pending = getPendingActions();
  if (pending.length === 0) return;

  for (const action of pending) {
    try {
      if (action.type === "clock-in") {
        await timeEntryService.clockIn(action.payload as ClockInInput);
      } else {
        await timeEntryService.clockOut(action.payload as ClockOutInput);
      }
    } catch (error) {
      // Keep failed actions in queue
      console.error("Failed to sync action:", action, error);
      return;
    }
  }

  clearPendingActions();
}
