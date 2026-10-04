/** "⌘" on Apple platforms, "Ctrl" elsewhere. Client-only: reads the user agent. */
export function modKeyLabel(): string {
  if (typeof navigator === 'undefined') return 'Ctrl';
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl';
}
