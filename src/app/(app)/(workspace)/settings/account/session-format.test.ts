import { describeDevice, formatRelative } from './session-format';

describe('describeDevice', () => {
  it.each([
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
      'Chrome on Windows',
      false,
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      'Safari on iOS',
      true,
    ],
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/141.0 Safari/537.36 Edg/141.0',
      'Edge on Windows',
      false,
    ],
    [
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36',
      'Chrome on Android',
      true,
    ],
  ])('%s', (ua, label, mobile) => {
    expect(describeDevice(ua)).toEqual({ label, mobile });
  });

  it('handles a missing user agent', () => {
    expect(describeDevice(null).label).toBe('Unknown device');
  });
});

describe('formatRelative', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it.each([
    ['2026-10-04T11:59:30Z', 'just now'],
    ['2026-10-04T11:47:00Z', '13 min ago'],
    ['2026-10-04T07:00:00Z', '5 h ago'],
    ['2026-10-03T09:00:00Z', 'yesterday'],
    ['2026-09-28T12:00:00Z', '6 days ago'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });
});
