import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { initializeAuth } from './stores/authStore';
import { register as registerServiceWorker, setupServiceWorkerMessaging } from './utils/serviceWorkerRegistration';
import './i18n/config';
import './index.css';

// Initialize auth state from localStorage
initializeAuth();

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Register service worker for PWA functionality
registerServiceWorker({
  onSuccess: () => {
    console.log('✅ App ready for offline use');
  },
  onUpdate: (registration) => {
    console.log('🔄 New version available');
    // Show user notification about update
    if (window.confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
      registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  },
  onError: (error) => {
    console.error('❌ Service worker registration failed:', error);
  },
});

// Setup service worker messaging
setupServiceWorkerMessaging();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
