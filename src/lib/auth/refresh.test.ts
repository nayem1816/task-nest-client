import { refreshSession } from './refresh';
import { getAccessToken, setAccessToken } from './token-store';

const session = {
  accessToken: 'token-2',
  expiresIn: 900,
  user: {
    id: 'u1',
    email: 'maya@northstarcoffee.co',
    name: 'Maya Chen',
    emailVerified: true,
    avatarUrl: null,
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
});

describe('refreshSession', () => {
  it('shares one request between concurrent callers', async () => {
    const fetchMock = vi.fn(async () => Response.json(session));
    vi.stubGlobal('fetch', fetchMock);

    const [a, b, c] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(a).toEqual(session);
    expect(b).toBe(a);
    expect(c).toBe(a);
    expect(getAccessToken()).toBe('token-2');
  });

  it('sends the CSRF header with the cookie', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => Response.json(session));
    vi.stubGlobal('fetch', fetchMock);

    await refreshSession();

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.headers).toMatchObject({ 'x-tasknest-csrf': '1' });
    expect(init?.credentials).toBe('same-origin');
  });

  it('retries once when another tab is mid-refresh', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ error: { code: 'REFRESH_IN_PROGRESS', message: '' } }, { status: 409 }),
      )
      .mockResolvedValueOnce(Response.json(session));
    vi.stubGlobal('fetch', fetchMock);

    const pending = refreshSession();
    await vi.runAllTimersAsync();

    await expect(pending).resolves.toEqual(session);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('resolves to null and forgets the token when there is no session', async () => {
    setAccessToken('stale');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json({ error: { code: 'SESSION_EXPIRED', message: '' } }, { status: 401 }),
      ),
    );

    await expect(refreshSession()).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
