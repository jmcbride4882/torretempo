import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthorization } from "../hooks/useAuthorization";
import { useTenant } from "../contexts/TenantContext";
import "./Sidebar.css";

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { tenantSlug } = useTenant();
  const {
    isPlatformAdmin,
    isEmployee,
    isManager,
    canManageScheduling,
    canViewSettings,
    canGenerateAttendanceReports,
  } = useAuthorization();

  // Helper function to prefix paths with tenant slug
  const getPath = (path: string) => {
    // Platform admins don't use tenant slug
    if (isPlatformAdmin()) {
      return path;
    }
    // Regular users get tenant-prefixed paths
    return tenantSlug ? `/t/${tenantSlug}${path}` : path;
  };

  // Dashboard icon
  const dashboardIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );

  // Employees/Team icon
  const peopleIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  // Time/Clock icon
  const clockIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );

  // Calendar/Schedule icon
  const calendarIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );

  // Leave/Document icon
  const leaveIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );

  // Reports/Chart icon
  const reportsIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );

  // Settings/Gear icon
  const settingsIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );

  // Profile icon
  const profileIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );

  // Tenants icon (building)
  const tenantsIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-3" />
      <path d="M9 9v.01" />
      <path d="M9 12v.01" />
      <path d="M9 15v.01" />
      <path d="M9 18v.01" />
    </svg>
  );

  // Billing icon (credit card)
  const billingIcon = (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );

  // Different menu structure based on role
  let menuItems: {
    path: string;
    icon: JSX.Element;
    label: string;
    visible?: boolean;
  }[] = [];

  if (isPlatformAdmin()) {
    // PLATFORM ADMIN VIEW: Platform management (NOT tenant operations)
    menuItems = [
      {
        path: getPath("/dashboard"),
        icon: dashboardIcon,
        label: "Platform Dashboard",
      },
      { path: getPath("/tenants"), icon: tenantsIcon, label: "Tenants" },
      { path: getPath("/employees"), icon: peopleIcon, label: "All Employees" },
      {
        path: getPath("/billing"),
        icon: billingIcon,
        label: "Billing & Revenue",
      },
      {
        path: getPath("/settings"),
        icon: settingsIcon,
        label: "Platform Settings",
      },
    ];
  } else if (isEmployee()) {
    // EMPLOYEE VIEW: Personal, self-service focused
    menuItems = [
      {
        path: getPath("/dashboard"),
        icon: dashboardIcon,
        label: t("nav.dashboard"),
      },
      { path: getPath("/time-entries"), icon: clockIcon, label: "My Time" },
      {
        path: getPath("/scheduling"),
        icon: calendarIcon,
        label: "My Schedule",
      },
      { path: getPath("/leave-requests"), icon: leaveIcon, label: "My Leave" },
      {
        path: getPath("/profile"),
        icon: profileIcon,
        label: t("user.profile"),
      },
    ];
  } else if (isManager()) {
    // MANAGER VIEW: Team management focused
    menuItems = [
      {
        path: getPath("/dashboard"),
        icon: dashboardIcon,
        label: t("nav.dashboard"),
      },
      { path: getPath("/employees"), icon: peopleIcon, label: "My Team" },
      { path: getPath("/time-entries"), icon: clockIcon, label: "Team Time" },
      {
        path: getPath("/scheduling"),
        icon: calendarIcon,
        label: "Team Schedule",
      },
      {
        path: getPath("/leave-requests"),
        icon: leaveIcon,
        label: "Team Leave",
      },
    ];

    // Add Reports if manager can generate them
    if (canGenerateAttendanceReports()) {
      menuItems.push({
        path: getPath("/reports"),
        icon: reportsIcon,
        label: "Reports",
      });
    }
  } else {
    // OWNER/ADMIN VIEW: Full administrative access
    menuItems = [
      {
        path: getPath("/dashboard"),
        icon: dashboardIcon,
        label: t("nav.dashboard"),
      },
      {
        path: getPath("/employees"),
        icon: peopleIcon,
        label: t("nav.employees"),
      },
      {
        path: getPath("/time-entries"),
        icon: clockIcon,
        label: t("nav.timeEntries"),
      },
      {
        path: getPath("/scheduling"),
        icon: calendarIcon,
        label: t("nav.scheduling"),
        visible: canManageScheduling(),
      },
      {
        path: getPath("/leave-requests"),
        icon: leaveIcon,
        label: t("nav.leaveRequests"),
      },
    ];

    // Add Reports if owner/admin can generate them
    if (canGenerateAttendanceReports()) {
      menuItems.push({
        path: getPath("/reports"),
        icon: reportsIcon,
        label: "Reports",
      });
    }

    // Add Billing (OWNER/ADMIN only)
    menuItems.push({
      path: getPath("/billing"),
      icon: billingIcon,
      label: t("nav.billing", "Billing & Subscription"),
    });

    // Add Settings if user has access
    if (canViewSettings()) {
      menuItems.push({
        path: getPath("/settings"),
        icon: settingsIcon,
        label: t("nav.settings"),
      });
    }
  }

  // Filter out items explicitly marked as not visible (backward compatibility)
  const visibleMenuItems = menuItems.filter((item) => item.visible !== false);

  // Gradient logo SVG component
  const LogoIcon = () => (
    <svg
      width="36"
      height="36"
      viewBox="0 0 32 32"
      fill="none"
      className="sidebar-logo-icon"
    >
      <defs>
        <linearGradient
          id="sidebar-logo-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#sidebar-logo-gradient)" />
      <path
        d="M16 8V16L21 21"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  return (
    <aside className={`sidebar ${isOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <div className="sidebar-logo">
        <LogoIcon />
        {isOpen && <span className="sidebar-logo-text">Torre Tempo</span>}
      </div>

      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "sidebar-link-active" : ""}`
            }
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {isOpen && <span className="sidebar-link-label">{item.label}</span>}
            {!isOpen && <span className="sidebar-tooltip">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
