/**
 * The access token lives in module memory only. It is never written to
 * localStorage or a readable cookie, so injected script cannot lift a token
 * that outlives the tab. A reload restores it through the refresh cookie.
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
