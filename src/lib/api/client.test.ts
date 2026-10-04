import { refreshSession } from '@/lib/auth/refresh';
import { setAccessToken } from '@/lib/auth/token-store';
import { authFetch, setSessionLostHandler } from './client';

vi.mock('@/lib/auth/refresh', () => ({ refreshSession: vi.fn() }));

const unauthorized = (code = 'SESSION_EXPIRED') =>
  Response.json({ error: { code, message: 'Sign in again.' } }, { status: 401 });

const request = (path: string) => new Request(`http://app.test${path}`);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(refreshSession).mockReset();
  setAccessToken(null);
});

describe('authFetch', () => {
  it('attaches the access token', async () => {
    setAccessToken('abc');
    const fetchMock = vi.fn(async (_req: Request) => Response.json({}));
    vi.stubGlobal('fetch', fetchMock);

    await authFetch(request('/api/v1/auth/me'));

    expect(fetchMock.mock.calls[0]?.[0].headers.get('Authorization')).toBe('Bearer abc');
  });

  it('refreshes once and replays the request with the new token', async () => {
    setAccessToken('expired');
    const fetchMock = vi
      .fn<(req: Request) => Promise<Response>>()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetchMock);
    vi.mocked(refreshSession).mockImplementationOnce(async () => {
      setAccessToken('fresh');
      return { accessToken: 'fresh' } as Awaited<ReturnType<typeof refreshSession>>;
    });

    const res = await authFetch(request('/api/v1/conversations'));

    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0].headers.get('Authorization')).toBe('Bearer fresh');
  });

  it('reports a lost session when the refresh fails', async () => {
    const lost = vi.fn();
    setSessionLostHandler(lost);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => unauthorized()),
    );
    vi.mocked(refreshSession).mockResolvedValueOnce(null);

    const res = await authFetch(request('/api/v1/conversations'));

    expect(res.status).toBe(401);
    expect(lost).toHaveBeenCalledOnce();
  });

  it('does not try to refresh on auth routes or for other 401 codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => unauthorized('INVALID_CREDENTIALS')),
    );

    await authFetch(request('/api/v1/auth/login'));
    await authFetch(request('/api/v1/conversations'));

    expect(refreshSession).not.toHaveBeenCalled();
  });
});
