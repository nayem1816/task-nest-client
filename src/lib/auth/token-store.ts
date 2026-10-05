/**
 * The access token lives in module memory only. It is never written to
 * localStorage or a readable cookie, so injected script cannot lift a token
 * that outlives the tab. A reload restores it through the refresh cookie.
 */
let accessToken: string | null = null;

const listeners = new Set<(token: string | null) => void>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  if (token === accessToken) return;
  accessToken = token;
  for (const listener of listeners) listener(token);
}

/** The realtime connection uses this to hand the server each refreshed token. */
export function onAccessTokenChange(listener: (token: string | null) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
