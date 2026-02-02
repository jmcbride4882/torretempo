import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import EmployeesPage from "./pages/EmployeesPage";
import ProfilePage from "./pages/ProfilePage";
import TimeEntriesPage from "./pages/TimeEntriesPage";
import SchedulingPage from "./pages/SchedulingPage";
import LeaveRequestsPage from "./pages/LeaveRequestsPage";
import SettingsPage from "./pages/SettingsPage";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import InstallPrompt from "./components/InstallPrompt";

function App() {
  return (
    <BrowserRouter>
      <InstallPrompt />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Routes with Dashboard Layout */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <DashboardPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/employees"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <EmployeesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <ProfilePage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/time-entries"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <TimeEntriesPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/scheduling"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <SchedulingPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/leave-requests"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <LeaveRequestsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute requiredRoles={["OWNER", "ADMIN", "MANAGER"]}>
              <DashboardLayout>
                <SettingsPage />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
