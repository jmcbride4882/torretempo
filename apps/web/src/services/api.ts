import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/authStore";

// Base API URL - use relative path for same-origin requests
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

// Create axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 second timeout
});

// Request interceptor - add access token to headers and update baseURL for tenant-scoped requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Get tenant slug from auth store (more reliable than URL parsing)
    const user = useAuthStore.getState().user;
    const tenantSlug = user?.tenantSlug;
    const isPlatformAdmin = user?.role === "PLATFORM_ADMIN";

    // DEBUG LOGGING
    console.log("[API Client] Request Interceptor:", {
      url: config.url,
      method: config.method,
      user: user
        ? {
            email: user.email,
            role: user.role,
            tenantSlug: user.tenantSlug,
            isPlatformAdmin,
          }
        : null,
      tenantSlug,
      willUseTenantPrefix: tenantSlug && !config.url?.startsWith("/auth"),
      willUsePlatformPrefix:
        isPlatformAdmin && !tenantSlug && !config.url?.startsWith("/auth"),
    });

    // Update baseURL based on user role and tenant context
    // Priority:
    // 1. Platform admins without tenant slug → /api/v1/platform (god mode)
    // 2. Users with tenant slug → /api/v1/t/:tenantSlug (tenant-scoped)
    // 3. Auth endpoints → /api/v1 (public)
    //
    // CRITICAL: Axios ignores baseURL if url starts with '/'
    // Solution: Remove leading slash from url when setting custom baseURL
    if (isPlatformAdmin && !tenantSlug && !config.url?.startsWith("/auth")) {
      config.url = config.url?.replace(/^\//, ""); // Remove leading slash
      config.baseURL = "/api/v1/platform";
      console.log(
        "[API Client] Using platform admin baseURL:",
        config.baseURL,
        "url:",
        config.url,
      );
    } else if (tenantSlug && !config.url?.startsWith("/auth")) {
      config.url = config.url?.replace(/^\//, ""); // Remove leading slash
      config.baseURL = `/api/v1/t/${tenantSlug}`;
      console.log(
        "[API Client] Using tenant-scoped baseURL:",
        config.baseURL,
        "url:",
        config.url,
      );
    } else {
      config.baseURL = "/api/v1";
      console.log("[API Client] Using public baseURL:", config.baseURL);
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        if (!refreshToken) {
          // No refresh token, redirect to login
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Attempt to refresh token
        const response = await axios.post("/api/v1/auth/refresh", {
          refreshToken,
        });

        const { accessToken: newAccessToken } = response.data;

        // Update stored token
        localStorage.setItem("accessToken", newAccessToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
