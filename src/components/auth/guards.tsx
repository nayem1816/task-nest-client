'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-provider';

export const HOME_PATH = '/app';

/** Only allows same-site paths, so `?next=` cannot send people to another origin. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return HOME_PATH;
  }
  return next;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (state.status === 'anonymous') {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [state.status, router, pathname]);

  if (state.status !== 'authenticated') return <FullPageSpinner />;
  return children;
}

/** Sign-in pages: a signed-in visitor is sent on to the app. */
export function GuestOnly({ children, next }: { children: React.ReactNode; next?: string }) {
  const { state } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.status === 'authenticated') router.replace(safeNextPath(next));
  }, [state.status, router, next]);

  return children;
}

function FullPageSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status">
      <span className="border-border border-t-brand size-5 animate-spin rounded-full border-2" />
      <span className="sr-only">Loading your workspace</span>
    </div>
  );
}
