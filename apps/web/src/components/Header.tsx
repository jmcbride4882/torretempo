import UserDropdown from "./UserDropdown";
import { ThemeToggleButton } from "./ThemeToggle";
import "./Header.css";

interface HeaderProps {
  onMenuClick: () => void;
  tenantName: string;
}

export default function Header({ onMenuClick, tenantName }: HeaderProps) {
  // Hamburger menu icon
  const MenuIcon = () => (
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
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );

  // Gradient logo for mobile header
  const LogoIcon = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <defs>
        <linearGradient
          id="header-logo-gradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#header-logo-gradient)" />
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
    <header className="header">
      <div className="header-left">
        <button
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Toggle navigation menu"
        >
          <MenuIcon />
        </button>

        <div className="header-brand">
          <LogoIcon />
          <span className="brand-name">Torre Tempo</span>
        </div>

        <div className="tenant-info">
          <span className="tenant-name">{tenantName}</span>
        </div>
      </div>

      <div className="header-right">
        <ThemeToggleButton />
        <UserDropdown />
      </div>
    </header>
  );
}
