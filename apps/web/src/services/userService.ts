import apiClient from './api';
import type { User } from '../types/user';

export const userService = {
  // Get all users in tenant
  async getAll(): Promise<User[]> {
    const response = await apiClient.get('/users');
    return response.data.data;
  },
};
