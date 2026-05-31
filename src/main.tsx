import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { logger } from './utils/logger'
import { initializeNotifications } from './utils/notifications'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

// Global error handlers for unhandled promise rejections and errors
window.addEventListener('error', (event) => {
  logger.error('Unhandled error:', event.error);
  // Prevent default browser error handling to avoid showing error dialog
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('Unhandled promise rejection:', event.reason);
  // Prevent default browser error handling
  event.preventDefault();
});

// Handle network errors gracefully
window.addEventListener('online', () => {
  logger.log('Network connection restored');
});

window.addEventListener('offline', () => {
  logger.warn('Network connection lost - app will continue to work offline');
});

// Initialize services (don't block app startup if it fails)
// Use setTimeout to defer initialization so it doesn't block the initial render
setTimeout(() => {
  initializeNotifications().catch(error => {
    // Errors are already handled in initializeNotifications, just log here as backup
    logger.error('Failed to initialize notifications (non-fatal):', error);
  });
}, 1000); // Wait 1 second after app starts before initializing notifications

registerSW({
  immediate: true,
});

import { AuthProvider } from './contexts/AuthContext'
import { PremiumProvider } from './contexts/PremiumContext'
import { storage } from './utils/storage'

// Production: keep demo session only if Firebase is not configured
// so the app remains usable without backend credentials
if (import.meta.env.PROD) {
  const hasFirebase = !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_API_KEY !== 'undefined' &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID !== 'undefined'
  );
  if (hasFirebase) {
    storage.setDemoUser(null);
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <PremiumProvider>
          <App />
        </PremiumProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
