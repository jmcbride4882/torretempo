import { ReactNode, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuthStore();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Get tenant name from user data or default
  const tenantName = user ? 'Demo Restaurant SL' : 'Torre Tempo';

  return (
    <div className="dashboard-layout">
      {/* Desktop Sidebar */}
      <div className="desktop-sidebar">
        <Sidebar isOpen={sidebarOpen} />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="mobile-overlay" onClick={toggleMobileMenu}></div>
          <div className="mobile-sidebar">
            <Sidebar isOpen={true} />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className={`main-content ${sidebarOpen ? 'main-content-shifted' : 'main-content-full'}`}>
        <Header onMenuClick={toggleMobileMenu} tenantName={tenantName} />
        
        <main className="content-area">
          {children}
        </main>

        <Footer />
      </div>

      {/* Sidebar Toggle Button (Desktop) */}
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={sidebarOpen ? 'Contraer sidebar' : 'Expandir sidebar'}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={sidebarOpen ? '' : 'rotate-180'}
        >
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
    </div>
  );
}
