import { env } from './env';

export type ApiStatus =
  { state: 'ready' } | { state: 'degraded'; failing: string[] } | { state: 'unreachable' };

interface ReadinessBody {
  checks?: Record<string, 'up' | 'down'>;
}

export async function getApiStatus(baseUrl = env.NEXT_PUBLIC_API_URL): Promise<ApiStatus> {
  try {
    const res = await fetch(`${baseUrl}/health/ready`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3_000),
    });
    if (res.ok) return { state: 'ready' };

    const body = (await res.json().catch(() => ({}))) as ReadinessBody;
    const failing = Object.entries(body.checks ?? {})
      .filter(([, status]) => status === 'down')
      .map(([name]) => name);
    return { state: 'degraded', failing };
  } catch {
    return { state: 'unreachable' };
  }
}
