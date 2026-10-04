import type { components } from '@/lib/api/schema';
import { toApiError } from '@/lib/api/errors';
import { setAccessToken } from './token-store';

export type AuthResponse = components['schemas']['AuthResponseDto'];

export const CSRF_HEADERS = { 'x-tasknest-csrf': '1' } as const;

// Another tab rotated the cookie a moment ago; by now the browser holds the new one.
const RACE_RETRY_DELAY_MS = 400;

let inFlight: Promise<AuthResponse | null> | null = null;

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers in
 * this tab share one request, so a burst of 401s triggers a single refresh.
 * Resolves to null when there is no usable session.
 */
export function refreshSession(): Promise<AuthResponse | null> {
  inFlight ??= doRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRefresh(retried = false): Promise<AuthResponse | null> {
  const res = await fetch('/api/v1/auth/refresh', {
    method: 'POST',
    headers: CSRF_HEADERS,
    credentials: 'same-origin',
  });

  if (res.ok) {
    const body = (await res.json()) as AuthResponse;
    setAccessToken(body.accessToken);
    return body;
  }

  if (res.status === 409 && !retried) {
    await new Promise((resolve) => setTimeout(resolve, RACE_RETRY_DELAY_MS));
    return doRefresh(true);
  }

  setAccessToken(null);
  if (res.status === 401) return null;
  throw toApiError(res.status, await res.json().catch(() => null));
}
