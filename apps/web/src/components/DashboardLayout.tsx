import { ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../stores/authStore";
import { useAuthorization } from "../hooks/useAuthorization";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import "./DashboardLayout.css";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const { isEmployee } = useAuthorization();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // Get tenant name from user data or default
  const tenantName = user ? "Demo Restaurant SL" : "Torre Tempo";

  // Mobile bottom nav icons
  const DashboardIcon = () => (
    <svg
      width="24"
      height="24"
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

  const ClockIcon = () => (
    <svg
      width="24"
      height="24"
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

  const CalendarIcon = () => (
    <svg
      width="24"
      height="24"
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

  const ProfileIcon = () => (
    <svg
      width="24"
      height="24"
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

  // Chevron icon for sidebar toggle
  const ChevronIcon = () => (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sidebarOpen ? "" : "rotate-180"}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );

  // Define mobile nav items based on role
  const mobileNavItems = isEmployee()
    ? [
        {
          path: "/dashboard",
          icon: DashboardIcon,
          label: t("nav.dashboard", "Home"),
        },
        {
          path: "/time-entries",
          icon: ClockIcon,
          label: t("nav.timeEntries", "Time"),
        },
        {
          path: "/scheduling",
          icon: CalendarIcon,
          label: t("nav.scheduling", "Schedule"),
        },
        {
          path: "/profile",
          icon: ProfileIcon,
          label: t("user.profile", "Profile"),
        },
      ]
    : [
        {
          path: "/dashboard",
          icon: DashboardIcon,
          label: t("nav.dashboard", "Home"),
        },
        {
          path: "/time-entries",
          icon: ClockIcon,
          label: t("nav.timeEntries", "Time"),
        },
        {
          path: "/scheduling",
          icon: CalendarIcon,
          label: t("nav.scheduling", "Schedule"),
        },
        {
          path: "/profile",
          icon: ProfileIcon,
          label: t("user.profile", "Profile"),
        },
      ];

  return (
    <div className="dashboard-layout">
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">
        <Sidebar isOpen={sidebarOpen} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={closeMobileMenu} />
          <div className="mobile-sidebar">
            <Sidebar isOpen={true} />
          </div>
        </>
      )}

      {/* Main Content */}
      <div
        className={`main-content ${sidebarOpen ? "main-content-shifted" : "main-content-full"}`}
      >
        <Header onMenuClick={toggleMobileMenu} tenantName={tenantName} />

        <main className="content-area">{children}</main>

        <Footer />
      </div>

      {/* Sidebar Toggle Button (Desktop) */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
      >
        <ChevronIcon />
      </button>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <div className="mobile-bottom-nav-inner">
          {mobileNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `mobile-nav-link ${isActive ? "active" : ""}`
              }
              onClick={closeMobileMenu}
            >
              <span className="mobile-nav-icon">
                <item.icon />
              </span>
              <span className="mobile-nav-label">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
