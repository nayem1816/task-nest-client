import { dayLabel } from './message-thread';

describe('dayLabel', () => {
  const now = new Date(2026, 9, 5, 15, 0);

  it('names today and yesterday, and dates anything older', () => {
    expect(dayLabel(new Date(2026, 9, 5, 9, 10).toISOString(), now)).toBe('Today');
    expect(dayLabel(new Date(2026, 9, 4, 23, 30).toISOString(), now)).toBe('Yesterday');
    expect(dayLabel(new Date(2026, 8, 28, 10, 0).toISOString(), now)).toBe('Monday, Sep 28');
  });
});
