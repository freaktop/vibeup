/**
 * Production-safe logger utility
 * Only logs in development mode to prevent leaking sensitive data and reduce noise in production
 */

// Check if we're in development mode
// @ts-ignore - __DEV__ may be injected by build tools
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : (import.meta.env?.MODE === 'development' || process.env.NODE_ENV === 'development');

export const logger = {
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // Errors are important even in production, but sanitize sensitive data
    if (isDev) {
      console.error(...args);
    } else {
      // In production, only log error messages without stack traces or sensitive data
      const sanitized = args.map(arg => {
        if (arg instanceof Error) {
          return arg.message;
        }
        if (typeof arg === 'object') {
          // Remove potentially sensitive fields
          const { password, token, apiKey, secret, ...safe } = arg as any;
          return safe;
        }
        return arg;
      });
      console.error('[VibeUp Error]', ...sanitized);
    }
  },
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },
};
