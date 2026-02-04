import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import ProfilePage from "./pages/ProfilePage";
import TimeEntriesPage from "./pages/TimeEntriesPage";
import SchedulingPage from "./pages/SchedulingPage";
import LeaveRequestsPage from "./pages/LeaveRequestsPage";
import SettingsPage from "./pages/SettingsPage";
import TenantsPage from "./pages/TenantsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import TenantLayout from "./components/TenantLayout";
import InstallPrompt from "./components/InstallPrompt";
import { TenantProvider } from "./contexts/TenantContext";
import { useAuthStore } from "./stores/authStore";
import {
  initOneSignal,
  subscribeToNotifications,
  setExternalUserId,
} from "./services/oneSignal";
import { userService } from "./services/userService";

function App() {
  const { user, isAuthenticated } = useAuthStore();

  // Initialize OneSignal when user is authenticated
  useEffect(() => {
    const setupPushNotifications = async () => {
      // Only initialize if user is authenticated and OneSignal App ID is configured
      const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;

      if (!isAuthenticated || !user || !appId) {
        return;
      }

      try {
        // Initialize OneSignal SDK
        await initOneSignal(appId);

        // Small delay to ensure OneSignal is fully loaded
        setTimeout(async () => {
          try {
            // Subscribe user to push notifications
            const playerId = await subscribeToNotifications();

            if (playerId) {
              // Set external user ID for targeting
              await setExternalUserId(user.id);

              // Save player ID to backend
              await userService.updateOneSignalPlayerId(playerId);

              console.log("[App] Push notifications configured successfully");
            }
          } catch (error) {
            console.error("[App] Failed to setup push notifications:", error);
          }
        }, 1000);
      } catch (error) {
        console.error("[App] Failed to initialize OneSignal:", error);
      }
    };

    setupPushNotifications();
  }, [isAuthenticated, user]);

  return (
    <BrowserRouter>
      <InstallPrompt />
      <Routes>
        {/* Public Routes (outside tenant context) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Platform Admin Routes (god-mode, wrapped in TenantProvider) */}
        <Route
          element={
            <TenantProvider>
              <Outlet />
            </TenantProvider>
          }
        >
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tenants"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <TenantsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/employees"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <EmployeesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/time-entries"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <TimeEntriesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/scheduling"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <SchedulingPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/leave-requests"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <LeaveRequestsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Tenant-scoped Routes (/t/:tenantSlug/*) */}
        <Route path="/t/:tenantSlug" element={<TenantLayout />}>
          {/* Protected Routes with Dashboard Layout */}
          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="employees"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <EmployeesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ProfilePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="time-entries"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <TimeEntriesPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="scheduling"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <SchedulingPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="leave-requests"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <LeaveRequestsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="settings"
            element={
              <ProtectedRoute requiredRoles={["OWNER", "ADMIN", "MANAGER"]}>
                <DashboardLayout>
                  <SettingsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="tenants"
            element={
              <ProtectedRoute requiredRoles={["PLATFORM_ADMIN"]}>
                <DashboardLayout>
                  <TenantsPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
