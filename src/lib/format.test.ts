import { formatExpiry } from './format';

describe('formatExpiry', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it.each([
    ['2026-10-11T12:00:00Z', 'in 7 days'],
    ['2026-10-05T12:00:00Z', 'in 1 day'],
    ['2026-10-04T15:00:00Z', 'in 3 hours'],
    ['2026-10-04T12:10:00Z', 'in 1 hour'],
    ['2026-10-04T11:00:00Z', 'expired'],
  ])('%s → %s', (iso, expected) => {
    expect(formatExpiry(iso, now)).toBe(expected);
  });
});
