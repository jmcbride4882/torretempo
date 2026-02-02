import { useAuthStore } from "../stores/authStore";

/**
 * Comprehensive RBAC Authorization Hook
 *
 * Two-Tier Role Hierarchy:
 *
 * PLATFORM TIER:
 *   PLATFORM_ADMIN (Torre Tempo owner - god mode)
 *
 * TENANT TIER:
 *   OWNER (Business owner) > ADMIN > MANAGER > EMPLOYEE
 */
export function useAuthorization() {
  const { user } = useAuthStore();

  // ===== PLATFORM ROLE CHECKS =====
  const isPlatformAdmin = () => user?.role?.toUpperCase() === "PLATFORM_ADMIN";

  // ===== TENANT ROLE CHECKS =====
  const isOwner = () => user?.role?.toUpperCase() === "OWNER";
  const isAdmin = () => user?.role?.toUpperCase() === "ADMIN";
  const isManager = () => user?.role?.toUpperCase() === "MANAGER";
  const isEmployee = () => user?.role?.toUpperCase() === "EMPLOYEE";

  // ===== ROLE COMBINATIONS =====
  const isOwnerOrAdmin = () => isPlatformAdmin() || isOwner() || isAdmin();
  const isAdminOrManager = () => isPlatformAdmin() || isAdmin() || isManager();
  const isManagerOrEmployee = () => isManager() || isEmployee();
  const isStaff = () =>
    isPlatformAdmin() || isOwner() || isAdmin() || isManager(); // Has administrative access

  const hasRole = (...roles: string[]) => {
    if (!user?.role) return false;
    // Platform admin bypasses all role checks
    if (user.role === "PLATFORM_ADMIN") return true;
    // Case-insensitive role comparison
    const userRoleUpper = user.role.toUpperCase();
    return roles.some((role) => role.toUpperCase() === userRoleUpper);
  };

  // Role hierarchy check: does user have at least this role level?
  const hasRoleLevel = (requiredRole: string) => {
    // Platform admin bypasses all checks
    if (isPlatformAdmin()) return true;

    const hierarchy = ["EMPLOYEE", "MANAGER", "ADMIN", "OWNER"];
    const userLevel = hierarchy.indexOf(user?.role || "");
    const requiredLevel = hierarchy.indexOf(requiredRole);
    return userLevel >= requiredLevel;
  };

  // ===== DASHBOARD PERMISSIONS =====
  const canViewDashboard = () => true; // All roles
  const canViewFullDashboard = () => isStaff(); // Owner/Admin/Manager see all data
  const canViewTeamDashboard = () => isManager(); // Manager sees team data
  const canViewPersonalDashboard = () => isEmployee(); // Employee sees own data

  // ===== PLATFORM ADMIN PERMISSIONS =====
  const canAccessAllTenants = () => isPlatformAdmin();
  const canImpersonateTenant = () => isPlatformAdmin();
  const canViewPlatformAnalytics = () => isPlatformAdmin();
  const canManagePlatformSettings = () => isPlatformAdmin();

  // ===== TENANT SETTINGS PERMISSIONS =====
  const canViewTenantInfo = () => isPlatformAdmin() || isOwner() || isAdmin();
  const canEditTenantInfo = () => isPlatformAdmin() || isOwner(); // Platform admin or tenant owner
  const canConfigureSMTP = () => isPlatformAdmin() || isOwner() || isAdmin();
  const canManageModules = () => isPlatformAdmin() || isOwner(); // Paid add-ons
  const canViewBilling = () => isPlatformAdmin() || isOwner();
  const canManageBilling = () => isPlatformAdmin() || isOwner();
  const canDeleteTenant = () => isPlatformAdmin() || isOwner();

  // ===== USER MANAGEMENT PERMISSIONS =====
  const canViewAllUsers = () => isPlatformAdmin() || isOwner() || isAdmin();
  const canViewTeamUsers = () => isManager();
  const canCreatePlatformAdmin = () => false; // Only via direct DB access
  const canCreateOwner = () => isPlatformAdmin(); // Only platform admin can create tenant owners
  const canCreateAdmin = () => isPlatformAdmin() || isOwner();
  const canCreateManager = () => isOwnerOrAdmin();
  const canCreateEmployee = () => isStaff();
  const canEditPlatformAdmin = () => false; // Protected
  const canEditOwner = () => isPlatformAdmin(); // Only platform admin can edit owners
  const canEditAdmin = () => isPlatformAdmin() || isOwner();
  const canEditManager = () => isOwnerOrAdmin();
  const canEditEmployee = () => isStaff();
  const canDeletePlatformAdmin = () => false; // Protected
  const canDeleteOwner = () => isPlatformAdmin(); // Only platform admin
  const canDeleteAdmin = () => isPlatformAdmin() || isOwner();
  const canDeleteManager = () => isOwnerOrAdmin();
  const canDeleteEmployee = () => isStaff();
  const canChangeUserRole = () => isPlatformAdmin() || isOwner() || isAdmin(); // Cannot promote to platform admin or owner
  const canResetPassword = () => isStaff();

  // ===== EMPLOYEE MANAGEMENT PERMISSIONS =====
  const canViewEmployees = () => true; // All roles (filtered by backend)
  const canViewAllEmployees = () => isOwnerOrAdmin();
  const canViewTeamEmployees = () => isManager();
  const canManageEmployees = () => isStaff(); // Create/edit/delete
  const canExportEmployees = () => isStaff();

  // ===== TIME TRACKING PERMISSIONS =====
  const canClockInOut = () => true; // All roles
  const canViewOwnTimeEntries = () => true; // All roles
  const canViewAllTimeEntries = () => isOwnerOrAdmin();
  const canViewTeamTimeEntries = () => isManager();
  const canEditTimeEntries = () => isStaff(); // Within scope
  const canApproveTimeCorrections = () => isStaff();
  const canViewGeolocation = () => isStaff();
  const canExportTimeEntries = () => isStaff();

  // ===== SCHEDULING PERMISSIONS =====
  const canViewSchedules = () => true; // All roles (own or team)
  const canViewAllSchedules = () => isOwnerOrAdmin();
  const canViewTeamSchedules = () => isManager();
  const canManageScheduling = () => isStaff(); // Create/edit/delete schedules
  const canPublishSchedules = () => isStaff();
  const canLockSchedules = () => isStaff();
  const canOverrideConflicts = () => isOwnerOrAdmin();
  const canExportSchedules = () => isStaff();

  // ===== LEAVE MANAGEMENT PERMISSIONS =====
  const canSubmitLeaveRequest = () => true; // All roles
  const canViewOwnLeaveRequests = () => true; // All roles
  const canViewAllLeaveRequests = () => isOwnerOrAdmin();
  const canViewTeamLeaveRequests = () => isManager();
  const canApproveLeaveRequests = () => isStaff();
  const canRejectLeaveRequests = () => isStaff();
  const canCancelApprovedLeaves = () => isStaff();
  const canAdjustLeaveBalance = () => isOwnerOrAdmin();
  const canExportLeaveData = () => isStaff();

  // ===== REPORTS PERMISSIONS =====
  const canViewReports = () => true; // All roles (scoped)
  const canGenerateAttendanceReports = () => isStaff();
  const canGeneratePayrollReports = () => isStaff();
  const canGenerateLeaveReports = () => isStaff();
  const canGenerateOvertimeReports = () => isStaff();
  const canExportReports = () => isStaff();
  const canExportSignedReports = () => isOwnerOrAdmin(); // Compliance

  // ===== DEPARTMENT PERMISSIONS =====
  const canViewDepartments = () => true; // All roles
  const canManageDepartments = () => isOwnerOrAdmin();
  const canAssignEmployeesToDepartment = () => isOwnerOrAdmin();

  // ===== AUDIT LOG PERMISSIONS =====
  const canViewAuditLogs = () => isOwnerOrAdmin();
  const canExportAuditLogs = () => isOwnerOrAdmin();

  // ===== SETTINGS PERMISSIONS =====
  const canViewSettings = () => isStaff(); // Owner/Admin/Manager have settings access
  const canAccessFullSettings = () => isOwnerOrAdmin(); // Full settings access

  return {
    // User info
    user,

    // Role checks
    isPlatformAdmin,
    isOwner,
    isAdmin,
    isManager,
    isEmployee,
    isOwnerOrAdmin,
    isAdminOrManager,
    isManagerOrEmployee,
    isStaff,
    hasRole,
    hasRoleLevel,

    // Dashboard
    canViewDashboard,
    canViewFullDashboard,
    canViewTeamDashboard,
    canViewPersonalDashboard,

    // Platform admin
    canAccessAllTenants,
    canImpersonateTenant,
    canViewPlatformAnalytics,
    canManagePlatformSettings,

    // Tenant settings
    canViewTenantInfo,
    canEditTenantInfo,
    canConfigureSMTP,
    canManageModules,
    canViewBilling,
    canManageBilling,
    canDeleteTenant,

    // User management
    canViewAllUsers,
    canViewTeamUsers,
    canCreatePlatformAdmin,
    canCreateOwner,
    canCreateAdmin,
    canCreateManager,
    canCreateEmployee,
    canEditPlatformAdmin,
    canEditOwner,
    canEditAdmin,
    canEditManager,
    canEditEmployee,
    canDeletePlatformAdmin,
    canDeleteOwner,
    canDeleteAdmin,
    canDeleteManager,
    canDeleteEmployee,
    canChangeUserRole,
    canResetPassword,

    // Employee management
    canViewEmployees,
    canViewAllEmployees,
    canViewTeamEmployees,
    canManageEmployees,
    canExportEmployees,

    // Time tracking
    canClockInOut,
    canViewOwnTimeEntries,
    canViewAllTimeEntries,
    canViewTeamTimeEntries,
    canEditTimeEntries,
    canApproveTimeCorrections,
    canViewGeolocation,
    canExportTimeEntries,

    // Scheduling
    canViewSchedules,
    canViewAllSchedules,
    canViewTeamSchedules,
    canManageScheduling,
    canPublishSchedules,
    canLockSchedules,
    canOverrideConflicts,
    canExportSchedules,

    // Leave management
    canSubmitLeaveRequest,
    canViewOwnLeaveRequests,
    canViewAllLeaveRequests,
    canViewTeamLeaveRequests,
    canApproveLeaveRequests,
    canRejectLeaveRequests,
    canCancelApprovedLeaves,
    canAdjustLeaveBalance,
    canExportLeaveData,

    // Reports
    canViewReports,
    canGenerateAttendanceReports,
    canGeneratePayrollReports,
    canGenerateLeaveReports,
    canGenerateOvertimeReports,
    canExportReports,
    canExportSignedReports,

    // Departments
    canViewDepartments,
    canManageDepartments,
    canAssignEmployeesToDepartment,

    // Audit logs
    canViewAuditLogs,
    canExportAuditLogs,

    // Settings
    canViewSettings,
    canAccessFullSettings,
  };
}
