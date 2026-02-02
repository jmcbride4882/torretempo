import apiClient from "./api";
import type {
  ShiftSwapRequest,
  CreateShiftSwapInput,
  ApproveShiftSwapInput,
  RejectShiftSwapInput,
  CancelShiftSwapInput,
  ShiftSwapFilters,
} from "../types/shift-swap";

export const shiftSwapService = {
  /**
   * Create a new shift swap request
   */
  async create(input: CreateShiftSwapInput): Promise<ShiftSwapRequest> {
    const response = await apiClient.post("/schedule/shift-swaps", input);
    return response.data;
  },

  /**
   * Get all shift swap requests for the current user
   * - Employees see only their own requests
   * - Managers/Admins see all requests
   */
  async getAll(filters?: ShiftSwapFilters): Promise<ShiftSwapRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.shiftId) params.append("shiftId", filters.shiftId);

    const queryString = params.toString();
    const url = `/schedule/shift-swaps${queryString ? `?${queryString}` : ""}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  /**
   * Get a specific shift swap request by ID
   */
  async getById(id: string): Promise<ShiftSwapRequest> {
    const response = await apiClient.get(`/schedule/shift-swaps/${id}`);
    return response.data;
  },

  /**
   * Approve a shift swap request (manager/admin only)
   */
  async approve(
    id: string,
    input?: ApproveShiftSwapInput,
  ): Promise<ShiftSwapRequest> {
    const response = await apiClient.post(
      `/schedule/shift-swaps/${id}/approve`,
      input || {},
    );
    return response.data;
  },

  /**
   * Reject a shift swap request (manager/admin only)
   */
  async reject(
    id: string,
    input: RejectShiftSwapInput,
  ): Promise<ShiftSwapRequest> {
    const response = await apiClient.post(
      `/schedule/shift-swaps/${id}/reject`,
      input,
    );
    return response.data;
  },

  /**
   * Cancel a shift swap request (requester only)
   */
  async cancel(
    id: string,
    input?: CancelShiftSwapInput,
  ): Promise<ShiftSwapRequest> {
    const response = await apiClient.post(
      `/schedule/shift-swaps/${id}/cancel`,
      input || {},
    );
    return response.data;
  },
};

export default shiftSwapService;
