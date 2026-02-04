export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "PLATFORM_ADMIN" | "OWNER" | "ADMIN" | "MANAGER" | "EMPLOYEE";
  tenantId: string;
  tenantSlug: string;
  isPlatformAdmin?: boolean; // Convenience flag
}

export interface LoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  legalName: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
}

export interface TokenRefreshResponse {
  accessToken: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearError: () => void;
}
