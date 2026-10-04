/**
 * The workspace the app is acting in. Kept in memory for the request layer and
 * remembered in localStorage so a reload reopens the same workspace. It is only
 * a preference: the API checks membership on every request.
 */
const STORAGE_KEY = 'tasknest.workspace';

let currentId: string | null = null;

export function getWorkspaceId(): string | null {
  return currentId;
}

/** Memory only; cheap enough to call while rendering. */
export function setWorkspaceId(id: string | null): void {
  currentId = id;
}

export function rememberWorkspaceId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Storage can be unavailable (private mode, blocked site data); memory is enough.
  }
}

export function readStoredWorkspaceId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
