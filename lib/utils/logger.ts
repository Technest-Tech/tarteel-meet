/**
 * Environment-aware logger utility
 * Only logs in development mode to improve production performance
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log debug information (only in development)
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (only in development)
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log info messages (only in development)
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Log debug messages (only in development)
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Log success messages (only in development)
   */
  success: (...args: any[]) => {
    if (isDev) {
      console.log('✅', ...args);
    }
  },
};

