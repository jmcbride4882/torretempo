import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import './UserDropdown.css';

export default function UserDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    // TODO: Update user preference in backend
  };

  if (!user) return null;

  return (
    <div className="user-dropdown" ref={dropdownRef}>
      <button
        className="user-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="user-avatar">
          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
        </div>
        <div className="user-info">
          <span className="user-name">{user.firstName} {user.lastName}</span>
          <span className="user-role">{user.role}</span>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`dropdown-arrow ${isOpen ? 'dropdown-arrow-open' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className="user-dropdown-menu">
          <button className="dropdown-item" onClick={() => { setIsOpen(false); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{t('user.profile')}</span>
          </button>

          <button className="dropdown-item" onClick={() => { setIsOpen(false); navigate('/settings'); }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v6m0 6v6m6-12l-5.2 3m-1.6 0L6 7m12 10l-5.2-3m-1.6 0L6 17"/>
            </svg>
            <span>{t('nav.settings')}</span>
          </button>

          <div className="dropdown-divider"></div>

          <div className="dropdown-section">
            <span className="dropdown-section-title">{t('user.language')}</span>
            <div className="language-switcher">
              <button
                className={`language-btn ${i18n.language === 'es' ? 'language-btn-active' : ''}`}
                onClick={() => changeLanguage('es')}
              >
                🇪🇸 Español
              </button>
              <button
                className={`language-btn ${i18n.language === 'en' ? 'language-btn-active' : ''}`}
                onClick={() => changeLanguage('en')}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          <div className="dropdown-divider"></div>

          <button className="dropdown-item dropdown-item-danger" onClick={handleLogout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>{t('auth.logout')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
