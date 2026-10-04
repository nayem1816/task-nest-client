// Order matters: Edge and Chrome user agents also contain "Safari", and
// Android ones contain "Linux".
const BROWSERS: [RegExp, string][] = [
  [/Edg\//, 'Edge'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
];
const SYSTEMS: [RegExp, string][] = [
  [/iPhone|iPad/, 'iOS'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Linux/, 'Linux'],
];

/**
 * Good-enough device names from a user agent. Not a parser: it only needs to
 * let someone recognise "Chrome on Windows" in their own session list.
 */
export function describeDevice(userAgent: string | null): { label: string; mobile: boolean } {
  if (!userAgent) return { label: 'Unknown device', mobile: false };

  const find = (list: [RegExp, string][]) => list.find(([re]) => re.test(userAgent))?.[1];
  const browser = find(BROWSERS);
  const os = find(SYSTEMS);
  const mobile = /iPhone|Android.+Mobile/.test(userAgent);

  if (browser && os) return { label: `${browser} on ${os}`, mobile };
  return { label: browser ?? os ?? 'Unknown device', mobile };
}
