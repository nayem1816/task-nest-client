/** Black or white, whichever reads better on the given #rrggbb background (WCAG relative luminance). */
export function textOn(hex: string): '#ffffff' | '#111827' {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return '#ffffff';
  const [r, g, b] = match.slice(1).map((part) => {
    const c = parseInt(part, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Contrast against white vs. against near-black (#111827, luminance ~0.012).
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.062 ? '#ffffff' : '#111827';
}
