import UserDropdown from './UserDropdown';
import './Header.css';

interface HeaderProps {
  onMenuClick: () => void;
  tenantName: string;
}

export default function Header({ onMenuClick, tenantName }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-button" onClick={onMenuClick}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div className="header-brand">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <defs>
              <linearGradient id="brand-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#brand-gradient)"/>
            <path d="M16 8V16L21 21" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="brand-name">Torre Tempo</span>
        </div>

        <div className="tenant-info">
          <span className="tenant-name">{tenantName}</span>
        </div>
      </div>

      <div className="header-right">
        <UserDropdown />
      </div>
    </header>
  );
}
