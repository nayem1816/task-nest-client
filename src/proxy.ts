import { type NextRequest, NextResponse } from 'next/server';

export const CLIENT_IP_HEADER = 'x-tasknest-client-ip';
export const PROXY_SECRET_HEADER = 'x-tasknest-proxy-secret';

/**
 * API calls are rewritten to the API server, which would otherwise see this
 * server's address for every user. Pass the visitor's address along, signed
 * with the shared secret so the API knows the header came from us.
 *
 * The address comes from the hosting platform's headers. Vercel overwrites
 * `x-real-ip` and `x-forwarded-for` itself; on a VPS the reverse proxy in front
 * of Next must do the same, or a visitor could choose their own address.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Never pass through values a visitor sent themselves.
  headers.delete(CLIENT_IP_HEADER);
  headers.delete(PROXY_SECRET_HEADER);

  const secret = process.env.EDGE_PROXY_SECRET;
  const ip = clientIp(request.headers);
  if (secret && ip) {
    headers.set(CLIENT_IP_HEADER, ip);
    headers.set(PROXY_SECRET_HEADER, secret);
  }

  return NextResponse.next({ request: { headers } });
}

export function clientIp(headers: Headers): string | null {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  return headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

export const config = { matcher: '/api/v1/:path*' };
