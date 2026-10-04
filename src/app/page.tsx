import Image from 'next/image';
import { getApiStatus, type ApiStatus } from '@/lib/api-status';

// The marketing site replaces this page. Until then it doubles as a quick check
// that the client can reach the API.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const status = await getApiStatus();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <Image src="/brand/tasknest-lockup.png" alt="TaskNest" width={132} height={106} priority />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Every customer conversation. One workspace.
        </h1>
        <p className="text-text-muted">
          TaskNest is being built. The workspace, inbox and AI agent will appear here as each part
          ships.
        </p>
      </div>
      <ApiStatusLine status={status} />
    </main>
  );
}

function ApiStatusLine({ status }: { status: ApiStatus }) {
  const { label, tone } = describe(status);
  return (
    <p className="border-border flex items-center gap-2 border-t pt-4 text-[13px]">
      <span aria-hidden className={`size-2 rounded-full ${tone}`} />
      <span className="text-text-muted">API</span>
      <span>{label}</span>
    </p>
  );
}

function describe(status: ApiStatus): { label: string; tone: string } {
  switch (status.state) {
    case 'ready':
      return { label: 'Connected', tone: 'bg-success' };
    case 'degraded':
      return {
        label: `Running, but ${status.failing.join(' and ') || 'a dependency'} is not responding`,
        tone: 'bg-warning',
      };
    case 'unreachable':
      return { label: 'Not reachable. Is the server running on port 4100?', tone: 'bg-danger' };
  }
}
