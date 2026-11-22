const PREFIX = '[MediaVault]';
const isDev = import.meta.env.DEV;

export const logger = {
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
