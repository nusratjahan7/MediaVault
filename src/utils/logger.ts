const PREFIX = '[MediaVault]';
const isDev = import.meta.env.DEV;

/**
 * Pipeline tracing is development-only and must be explicitly enabled with
 * `VITE_DOWNLOAD_TRACE=1` so unit tests and normal development stay quiet.
 * It is removed from production builds because `import.meta.env.DEV` is false.
 */
const isTraceEnabled = isDev && import.meta.env.VITE_DOWNLOAD_TRACE === '1';

export const logger = {
  trace(...args: unknown[]): void {
    if (isTraceEnabled) {
      console.debug(PREFIX, ...args);
    }
  },
  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug(PREFIX, ...args);
    }
  },
  info(...args: unknown[]): void {
    if (isDev) {
      console.info(PREFIX, ...args);
    }
  },
  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args);
  },
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
  },
};
