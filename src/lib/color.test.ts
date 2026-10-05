import { textOn } from './color';

describe('textOn', () => {
  it.each([
    ['#2563eb', '#ffffff'],
    ['#9a3412', '#ffffff'],
    ['#111827', '#ffffff'],
    ['#facc15', '#111827'],
    ['#ffffff', '#111827'],
    ['#a3e635', '#111827'],
    ['not-a-color', '#ffffff'],
  ])('%s → %s', (bg, expected) => {
    expect(textOn(bg)).toBe(expected);
  });
});
