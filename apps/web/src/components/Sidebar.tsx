import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthorization } from '../hooks/useAuthorization';
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
}

export default function Sidebar({ isOpen }: SidebarProps) {
  const { t } = useTranslation();
  const { 
    isPlatformAdmin,
    isEmployee, 
    isManager, 
    canManageScheduling, 
    canViewSettings,
    canGenerateAttendanceReports 
  } = useAuthorization();

  // Dashboard icon
  const dashboardIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
    </svg>
  );

  // Employees/Team icon
  const peopleIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );

  // Time/Clock icon
  const clockIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );

  // Calendar/Schedule icon
  const calendarIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );

  // Leave/Document icon
  const leaveIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  );

  // Reports/Chart icon
  const reportsIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="20" x2="12" y2="10"/>
      <line x1="18" y1="20" x2="18" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="16"/>
    </svg>
  );

  // Settings/Gear icon
  const settingsIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v6m0 6v6m6-12l-5.2 3m-1.6 0L6 7m12 10l-5.2-3m-1.6 0L6 17"/>
    </svg>
  );

  // Different menu structure based on role
  let menuItems = [];

  if (isPlatformAdmin()) {
    // PLATFORM ADMIN VIEW: God mode - full system access
    menuItems = [
      { path: '/dashboard', icon: dashboardIcon, label: '🌐 Platform Dashboard' },
      { path: '/tenants', icon: peopleIcon, label: 'All Tenants' },
      { path: '/employees', icon: peopleIcon, label: 'All Employees' },
      { path: '/time-entries', icon: clockIcon, label: 'All Time Entries' },
      { path: '/scheduling', icon: calendarIcon, label: 'All Schedules' },
      { path: '/leave-requests', icon: leaveIcon, label: 'All Leave Requests' },
      { path: '/reports', icon: reportsIcon, label: 'Platform Reports' },
      { path: '/settings', icon: settingsIcon, label: 'Platform Settings' },
    ];
  } else if (isEmployee()) {
    // EMPLOYEE VIEW: Personal, self-service focused
    menuItems = [
      { path: '/dashboard', icon: dashboardIcon, label: t('nav.dashboard') },
      { path: '/time-entries', icon: clockIcon, label: 'My Time' },
      { path: '/scheduling', icon: calendarIcon, label: 'My Schedule' },
      { path: '/leave-requests', icon: leaveIcon, label: 'My Leave' },
      { path: '/profile', icon: peopleIcon, label: t('user.profile') },
    ];
  } else if (isManager()) {
    // MANAGER VIEW: Team management focused
    menuItems = [
      { path: '/dashboard', icon: dashboardIcon, label: t('nav.dashboard') },
      { path: '/employees', icon: peopleIcon, label: 'My Team' },
      { path: '/time-entries', icon: clockIcon, label: 'Team Time' },
      { path: '/scheduling', icon: calendarIcon, label: 'Team Schedule' },
      { path: '/leave-requests', icon: leaveIcon, label: 'Team Leave' },
    ];
    
    // Add Reports if manager can generate them
    if (canGenerateAttendanceReports()) {
      menuItems.push({ path: '/reports', icon: reportsIcon, label: 'Reports' });
    }
  } else {
    // OWNER/ADMIN VIEW: Full administrative access
    menuItems = [
      { path: '/dashboard', icon: dashboardIcon, label: t('nav.dashboard') },
      { path: '/employees', icon: peopleIcon, label: t('nav.employees') },
      { path: '/time-entries', icon: clockIcon, label: t('nav.timeEntries') },
      { path: '/scheduling', icon: calendarIcon, label: t('nav.scheduling'), visible: canManageScheduling() },
      { path: '/leave-requests', icon: leaveIcon, label: t('nav.leaveRequests') },
    ];

    // Add Reports if owner/admin can generate them
    if (canGenerateAttendanceReports()) {
      menuItems.push({ path: '/reports', icon: reportsIcon, label: 'Reports' });
    }

    // Add Settings if user has access
    if (canViewSettings()) {
      menuItems.push({ path: '/settings', icon: settingsIcon, label: t('nav.settings') });
    }
  }

  // Filter out items explicitly marked as not visible (backward compatibility)
  const visibleMenuItems = menuItems.filter(item => item.visible !== false);

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-logo">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#3B82F6"/>
          <path d="M16 8V16L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
        {isOpen && <span className="sidebar-logo-text">Torre Tempo</span>}
      </div>

      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {isOpen && <span className="sidebar-link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
