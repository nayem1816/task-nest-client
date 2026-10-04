// @vitest-environment node
import { NextRequest } from 'next/server';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER, proxy } from './proxy';

const SECRET = 'web-to-api-secret-that-is-long-enough';

function forwardedHeaders(headers: Record<string, string>): Headers {
  const res = proxy(new NextRequest('https://app.test/api/v1/auth/login', { headers }));
  // NextResponse.next({ request }) encodes the upstream headers on the response.
  const out = new Headers();
  for (const [key, value] of res.headers) {
    const match = key.match(/^x-middleware-request-(.+)$/);
    if (match?.[1]) out.set(match[1], value);
  }
  return out;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy', () => {
  it('passes the platform-reported address with the secret', () => {
    vi.stubEnv('EDGE_PROXY_SECRET', SECRET);
    const out = forwardedHeaders({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' });

    expect(out.get(CLIENT_IP_HEADER)).toBe('203.0.113.9');
    expect(out.get(PROXY_SECRET_HEADER)).toBe(SECRET);
  });

  it('prefers x-real-ip when the platform sets it', () => {
    vi.stubEnv('EDGE_PROXY_SECRET', SECRET);
    const out = forwardedHeaders({ 'x-real-ip': '198.51.100.4', 'x-forwarded-for': '1.1.1.1' });

    expect(out.get(CLIENT_IP_HEADER)).toBe('198.51.100.4');
  });

  it('drops values a visitor tried to set', () => {
    vi.stubEnv('EDGE_PROXY_SECRET', '');
    const out = forwardedHeaders({
      [CLIENT_IP_HEADER]: '6.6.6.6',
      [PROXY_SECRET_HEADER]: 'guess',
    });

    expect(out.get(CLIENT_IP_HEADER)).toBeNull();
    expect(out.get(PROXY_SECRET_HEADER)).toBeNull();
  });
});
