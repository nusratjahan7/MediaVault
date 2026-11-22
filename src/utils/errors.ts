import type { ApiErrorPayload } from '@/types/messages';

export type ErrorCode =
  | 'PERMISSION_DENIED'
  | 'NOT_SUPPORTED'
  | 'TAB_UNAVAILABLE'
  | 'CONTENT_SCRIPT_FAILED'
  | 'SCAN_FAILED'
  | 'DOWNLOAD_FAILED'
  | 'INVALID_INPUT'
  | 'STORAGE_FAILED'
  | 'MESSAGE_FAILED'
  | 'TIMEOUT'
  | 'UNKNOWN';

const KNOWN_CODES = new Set<string>([
  'PERMISSION_DENIED',
  'NOT_SUPPORTED',
  'TAB_UNAVAILABLE',
  'CONTENT_SCRIPT_FAILED',
  'SCAN_FAILED',
  'DOWNLOAD_FAILED',
  'INVALID_INPUT',
  'STORAGE_FAILED',
  'MESSAGE_FAILED',
  'TIMEOUT',
  'UNKNOWN',
]);

export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toErrorPayload(error: unknown): ApiErrorPayload {
  if (isAppError(error)) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    return { code: 'UNKNOWN', message: error.message };
  }

  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
}

export function fromErrorPayload(payload: ApiErrorPayload): AppError {
  const code = KNOWN_CODES.has(payload.code) ? (payload.code as ErrorCode) : 'UNKNOWN';
  return new AppError(code, payload.message);
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}
