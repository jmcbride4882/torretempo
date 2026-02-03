import apiClient from "./api";

export const locationService = {
  /**
   * Get all tenant locations from schedules and shifts
   */
  async getLocations(): Promise<string[]> {
    const response = await apiClient.get("/locations");
    return response.data.data;
  },
};
