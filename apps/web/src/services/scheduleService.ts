import apiClient from "./api";
import type {
  Schedule,
  Shift,
  ScheduleConflictsResponse,
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateShiftInput,
  UpdateShiftInput,
  CopyScheduleInput,
  LockScheduleInput,
  UnlockScheduleInput,
  DuplicateShiftInput,
  ScheduleFilters,
  ShiftFilters,
} from "../types/schedule";

export const scheduleService = {
  // ============================================================================
  // SCHEDULE ENDPOINTS
  // ============================================================================

  /**
   * Get all schedules for tenant with optional filters
   */
  async getAll(filters?: ScheduleFilters): Promise<Schedule[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.startDate) params.append("start_date", filters.startDate);
    if (filters?.endDate) params.append("end_date", filters.endDate);
    if (filters?.departmentId)
      params.append("department_id", filters.departmentId);

    const queryString = params.toString();
    const url = `/schedule/schedules${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get(url);
    return response.data.data;
  },

  /**
   * Get schedule by ID
   */
  async getById(id: string): Promise<Schedule> {
    const response = await apiClient.get(`/schedule/schedules/${id}`);
    return response.data.data;
  },

  /**
   * Create new schedule (draft status)
   */
  async create(input: CreateScheduleInput): Promise<Schedule> {
    const response = await apiClient.post("/schedule/schedules", input);
    return response.data.data;
  },

  /**
   * Update schedule
   */
  async update(id: string, input: UpdateScheduleInput): Promise<Schedule> {
    const response = await apiClient.put(`/schedule/schedules/${id}`, input);
    return response.data.data;
  },

  /**
   * Delete schedule (soft delete)
   */
  async delete(id: string): Promise<void> {
    await apiClient.delete(`/schedule/schedules/${id}`);
  },

  /**
   * Publish draft schedule (requires all conflicts resolved)
   */
  async publish(id: string): Promise<Schedule> {
    const response = await apiClient.post(`/schedule/schedules/${id}/publish`);
    return response.data.data;
  },

  /**
   * Unpublish published schedule (back to draft)
   */
  async unpublish(id: string): Promise<Schedule> {
    const response = await apiClient.post(
      `/schedule/schedules/${id}/unpublish`,
    );
    return response.data.data;
  },

  /**
   * Lock published schedule
   */
  async lock(id: string, input?: LockScheduleInput): Promise<Schedule> {
    const response = await apiClient.post(
      `/schedule/schedules/${id}/lock`,
      input || {},
    );
    return response.data.data;
  },

  /**
   * Unlock locked schedule (requires reason)
   */
  async unlock(id: string, input: UnlockScheduleInput): Promise<Schedule> {
    const response = await apiClient.post(
      `/schedule/schedules/${id}/unlock`,
      input,
    );
    return response.data.data;
  },

  /**
   * Copy schedule to new date range
   */
  async copy(id: string, input: CopyScheduleInput): Promise<Schedule> {
    const response = await apiClient.post(
      `/schedule/schedules/${id}/copy`,
      input,
    );
    return response.data.data;
  },

  // ============================================================================
  // SHIFT ENDPOINTS
  // ============================================================================

  /**
   * Get all shifts for a schedule with optional filters
   */
  async getAllShiftsForSchedule(
    scheduleId: string,
    filters?: ShiftFilters,
  ): Promise<Shift[]> {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append("employee_id", filters.employeeId);
    if (filters?.role) params.append("role", filters.role);
    if (filters?.hasConflicts !== undefined) {
      params.append("has_conflicts", String(filters.hasConflicts));
    }

    const queryString = params.toString();
    const url = `/schedule/schedules/${scheduleId}/shifts${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get(url);
    return response.data.data;
  },

  /**
   * Get shift by ID
   */
  async getShiftById(id: string): Promise<Shift> {
    const response = await apiClient.get(`/schedule/shifts/${id}`);
    return response.data.data;
  },

  /**
   * Create new shift in a schedule
   */
  async createShift(
    scheduleId: string,
    input: CreateShiftInput,
  ): Promise<Shift> {
    const response = await apiClient.post(
      `/schedule/schedules/${scheduleId}/shifts`,
      input,
    );
    return response.data.data;
  },

  /**
   * Update shift
   */
  async updateShift(id: string, input: UpdateShiftInput): Promise<Shift> {
    const response = await apiClient.put(`/schedule/shifts/${id}`, input);
    return response.data.data;
  },

  /**
   * Delete shift (soft delete)
   */
  async deleteShift(id: string): Promise<void> {
    await apiClient.delete(`/schedule/shifts/${id}`);
  },

  /**
   * Duplicate shift to new date
   */
  async duplicateShift(id: string, input: DuplicateShiftInput): Promise<Shift> {
    const response = await apiClient.post(
      `/schedule/shifts/${id}/duplicate`,
      input,
    );
    return response.data.data;
  },

  // ============================================================================
  // CONFLICT ENDPOINTS
  // ============================================================================

  /**
   * Get all conflicts for a schedule
   */
  async getAllConflictsForSchedule(
    scheduleId: string,
  ): Promise<ScheduleConflictsResponse> {
    const response = await apiClient.get(
      `/schedule/schedules/${scheduleId}/conflicts`,
    );
    return response.data.data;
  },
};
