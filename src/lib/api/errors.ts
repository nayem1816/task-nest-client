/** Shape of every error body the API returns. */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly requestId?: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const error = (value as { error: unknown }).error;
  return typeof error === 'object' && error !== null && 'code' in error && 'message' in error;
}

export function toApiError(status: number, body: unknown): ApiError {
  if (isErrorBody(body)) {
    const { code, message, requestId, details } = body.error;
    return new ApiError(status, code, message, requestId, details);
  }
  return new ApiError(
    status,
    'UNEXPECTED_RESPONSE',
    status >= 500
      ? 'The server ran into a problem. Try again in a moment.'
      : 'Something went wrong. Try again.',
  );
}

/** For anything thrown from a request, including network failures. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError)
    return "Can't reach TaskNest. Check your connection and try again.";
  return 'Something went wrong. Try again.';
}

/**
 * openapi-fetch resolves with `{ data, error, response }` instead of throwing.
 * This turns that into a thrown ApiError, which is what React Query expects.
 */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (result.response.ok) return result.data as T;
  throw toApiError(result.response.status, result.error);
}
