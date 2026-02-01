import apiClient from './api';
import { LoginRequest, LoginResponse, TokenRefreshResponse } from '../types/auth';
import { AxiosError } from 'axios';

/**
 * Login service - authenticate user with email, password, and tenant slug
 */
export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      throw new Error(message);
    }
    throw new Error('Login failed');
  }
};

/**
 * Logout service - invalidate refresh token (optional, for token blacklisting)
 */
export const logout = async (): Promise<void> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      await apiClient.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    // Ignore logout errors - local cleanup is more important
    console.error('Logout service error:', error);
  }
};

/**
 * Refresh token service - get new access token using refresh token
 */
export const refreshToken = async (refreshToken: string): Promise<TokenRefreshResponse> => {
  try {
    const response = await apiClient.post<TokenRefreshResponse>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      const message = error.response?.data?.error || error.message || 'Token refresh failed';
      throw new Error(message);
    }
    throw new Error('Token refresh failed');
  }
};
