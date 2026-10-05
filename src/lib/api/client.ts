import createClient from 'openapi-fetch';
import { refreshSession } from '@/lib/auth/refresh';
import { getAccessToken } from '@/lib/auth/token-store';
import { getWorkspaceId } from '@/lib/workspace/workspace-store';
import type { paths } from './schema';

export const ORGANIZATION_HEADER = 'x-organization-id';

const RETRYABLE_AUTH_CODES = new Set(['UNAUTHENTICATED', 'SESSION_EXPIRED']);

let onSessionLost: () => void = () => {};

/** Called when a request fails auth and the session cannot be refreshed. */
export function setSessionLostHandler(handler: () => void): void {
  onSessionLost = handler;
}

/** For callers outside this module that find the session gone (the realtime connection). */
export function reportSessionLost(): void {
  onSessionLost();
}

/**
 * fetch with the access token attached. On a 401 it refreshes once and replays
 * the request; if that is not possible the session is gone and the app is told.
 */
export async function authFetch(input: Request): Promise<Response> {
  const replay = input.clone();
  const res = await fetch(withContext(input));
  if (res.status !== 401 || input.url.includes('/api/v1/auth/')) return res;

  const code = await res
    .clone()
    .json()
    .then((b: { error?: { code?: string } }) => b.error?.code)
    .catch(() => undefined);
  if (!code || !RETRYABLE_AUTH_CODES.has(code)) return res;

  const session = await refreshSession().catch(() => null);
  if (!session) {
    onSessionLost();
    return res;
  }
  return fetch(withContext(replay));
}

/** Attaches the access token and, unless the caller chose one, the current workspace. */
function withContext(request: Request): Request {
  const token = getAccessToken();
  if (token) request.headers.set('Authorization', `Bearer ${token}`);
  const workspace = getWorkspaceId();
  if (workspace && !request.headers.has(ORGANIZATION_HEADER)) {
    request.headers.set(ORGANIZATION_HEADER, workspace);
  }
  return request;
}

/** Typed client for the TaskNest API. Paths and bodies come from the API's OpenAPI document. */
export const api = createClient<paths>({
  // Same origin as the page; the Next rewrite forwards /api/v1 to the API.
  baseUrl: typeof window === 'undefined' ? '' : window.location.origin,
  fetch: authFetch,
  credentials: 'same-origin',
});
