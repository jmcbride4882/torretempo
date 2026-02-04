import { useEffect, lazy, Suspense } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
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

// Lazy load pages
const LandingPage = lazy(() => import("./pages/LandingPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const TimeEntriesPage = lazy(() => import("./pages/TimeEntriesPage"));
const SchedulingPage = lazy(() => import("./pages/SchedulingPage"));
const LeaveRequestsPage = lazy(() => import("./pages/LeaveRequestsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TenantsPage = lazy(() => import("./pages/TenantsPage"));

// Loading fallback component
const PageLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#f5f5f5",
    }}
  >
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "4px solid #e0e0e0",
          borderTop: "4px solid #6366f1",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          margin: "0 auto 16px",
        }}
      />
      <p style={{ color: "#666", margin: 0 }}>Loading...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

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
      <Suspense fallback={<PageLoader />}>
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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
