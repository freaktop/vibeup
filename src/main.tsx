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
import { storage } from './utils/storage'

// Production: clear any demo session so users must sign in with real auth
if (import.meta.env.PROD) {
  storage.setDemoUser(null);
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
