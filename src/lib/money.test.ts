import { formatMoney, parseMoney } from './money';

describe('formatMoney', () => {
  it.each([
    [6150, 'USD', '$61.50'],
    [0, 'USD', '$0.00'],
    [123456, 'USD', '$1,234.56'],
    [1999, 'EUR', '€19.99'],
  ])('%i %s → %s', (cents, currency, expected) => {
    expect(formatMoney(cents, currency)).toBe(expected);
  });
});

describe('parseMoney', () => {
  it.each([
    ['61.50', 6150],
    ['$1,234.5', 123450],
    ['17', 1700],
    [' 0.07 ', 7],
  ])('%s → %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(['', '-5', '1.234', 'abc', '1.2.3'])('rejects %j', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});
