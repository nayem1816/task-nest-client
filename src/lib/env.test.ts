import { parsePublicEnv } from './env';

describe('parsePublicEnv', () => {
  it('falls back to the local API when unset', () => {
    expect(parsePublicEnv({}).NEXT_PUBLIC_API_URL).toBe('http://localhost:4100/api/v1');
  });

  it('rejects a value that is not a URL', () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_API_URL: 'localhost:4100' })).toThrow(
      /NEXT_PUBLIC_API_URL/,
    );
  });
});
