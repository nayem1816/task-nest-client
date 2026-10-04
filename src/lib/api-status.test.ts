import { getApiStatus } from './api-status';

const BASE = 'http://api.test/api/v1';

function mockFetch(impl: () => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getApiStatus', () => {
  it('is ready when the readiness probe returns 200', async () => {
    mockFetch(async () => Response.json({ status: 'ok' }));

    await expect(getApiStatus(BASE)).resolves.toEqual({ state: 'ready' });
  });

  it('names the dependencies that are down', async () => {
    mockFetch(async () =>
      Response.json(
        { status: 'degraded', checks: { database: 'up', redis: 'down' } },
        { status: 503 },
      ),
    );

    await expect(getApiStatus(BASE)).resolves.toEqual({ state: 'degraded', failing: ['redis'] });
  });

  it('is unreachable when the request itself fails', async () => {
    mockFetch(async () => {
      throw new TypeError('fetch failed');
    });

    await expect(getApiStatus(BASE)).resolves.toEqual({ state: 'unreachable' });
  });
});
