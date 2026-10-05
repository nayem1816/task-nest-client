import { shortTime } from './inbox-badges';

describe('shortTime', () => {
  const now = Date.parse('2026-10-05T12:00:00Z');

  it.each([
    ['2026-10-05T11:59:40Z', 'now'],
    ['2026-10-05T11:48:00Z', '12m'],
    ['2026-10-05T09:00:00Z', '3h'],
    ['2026-10-04T08:00:00Z', 'Yesterday'],
    ['2026-09-28T12:00:00Z', 'Sep 28'],
  ])('%s → %s', (iso, expected) => {
    expect(shortTime(iso, now)).toBe(expected);
  });
});
