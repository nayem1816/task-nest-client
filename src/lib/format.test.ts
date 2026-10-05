import { formatExpiry, formatRelative, lastDays } from './format';

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

describe('formatRelative', () => {
  const now = Date.parse('2026-10-04T12:00:00Z');

  it.each([
    ['2026-10-04T11:59:30Z', 'just now'],
    ['2026-10-04T11:47:00Z', '13 min ago'],
    ['2026-10-04T07:00:00Z', '5 h ago'],
    ['2026-10-03T09:00:00Z', 'yesterday'],
    ['2026-09-28T12:00:00Z', '6 days ago'],
    ['2026-08-01T12:00:00Z', 'Aug 1, 2026'],
  ])('%s → %s', (iso, expected) => {
    expect(formatRelative(iso, now)).toBe(expected);
  });
});

describe('lastDays', () => {
  it('lists calendar days in the given time zone, oldest first', () => {
    const now = Date.parse('2026-10-05T03:00:00Z');
    expect(lastDays(3, 'UTC', now)).toEqual(['2026-10-03', '2026-10-04', '2026-10-05']);
    // Still the 4th in Chicago.
    expect(lastDays(2, 'America/Chicago', now)).toEqual(['2026-10-03', '2026-10-04']);
  });
});
