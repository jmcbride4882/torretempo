import apiClient from "./api";
import type { User } from "../types/user";

export const userService = {
  // Get all users in tenant
  async getAll(): Promise<User[]> {
    const response = await apiClient.get("/users");
    return response.data.data;
  },

  // Update current user's OneSignal player ID for push notifications
  async updateOneSignalPlayerId(playerId: string): Promise<User> {
    const response = await apiClient.patch("/users/me/onesignal-player-id", {
      playerId,
    });
    return response.data.data;
  },

  // Remove current user's OneSignal player ID (unsubscribe from notifications)
  async removeOneSignalPlayerId(): Promise<void> {
    await apiClient.delete("/users/me/onesignal-player-id");
  },
};
