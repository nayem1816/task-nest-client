import { HOME_PATH, safeNextPath } from './guards';

describe('safeNextPath', () => {
  it('keeps paths on this site', () => {
    expect(safeNextPath('/app/inbox?filter=mine')).toBe('/app/inbox?filter=mine');
  });

  it.each([
    ['missing', null],
    ['absolute URL', 'https://evil.example/phish'],
    ['protocol-relative URL', '//evil.example'],
    ['backslash trick', '/\\evil.example'],
    ['relative path', 'app'],
  ])('falls back to the app for a %s', (_label, value) => {
    expect(safeNextPath(value)).toBe(HOME_PATH);
  });
});
