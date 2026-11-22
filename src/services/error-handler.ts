import type { ApiResponse } from '@/types/messages';
import { toErrorPayload } from '@/utils/errors';
import { logger } from '@/utils/logger';

/**
 * Central request boundary for the service worker. Every typed message is executed
 * through this wrapper so UI callers always receive a serializable ApiResponse and
 * no raw exception ever crosses the extension messaging boundary.
 */
export async function runRequest<T>(
  request: { type: string },
  operation: () => Promise<T>,
): Promise<ApiResponse<T>> {
  try {
    return { ok: true, data: await operation() };
  } catch (error) {
    const payload = toErrorPayload(error);
    logger.warn('Request failed.', request.type, payload.code);
    return { ok: false, error: payload };
  }
}
