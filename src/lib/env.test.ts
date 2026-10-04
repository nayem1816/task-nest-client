import { parseServerEnv } from './env';

describe('parseServerEnv', () => {
  it('falls back to the local API when unset', () => {
    expect(parseServerEnv({}).API_ORIGIN).toBe('http://localhost:4100');
  });

  it('rejects a value without an http(s) scheme', () => {
    expect(() => parseServerEnv({ API_ORIGIN: 'localhost:4100' })).toThrow(/API_ORIGIN/);
  });
});
