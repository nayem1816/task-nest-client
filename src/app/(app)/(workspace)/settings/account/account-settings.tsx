'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Laptop, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/page/page-header';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';
import { formatRelative } from '@/lib/format';
import { describeDevice } from './session-format';

export function AccountSettings() {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return null;
  const { user } = state;

  return (
    <div className="space-y-8">
      <PageHeader title="Account" description="How you sign in, and where you're signed in." />

      <dl className="border-border divide-border divide-y rounded-[10px] border">
        <div className="flex gap-4 px-4 py-3">
          <dt className="text-text-muted w-28 shrink-0">Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div className="flex gap-4 px-4 py-3">
          <dt className="text-text-muted w-28 shrink-0">Email</dt>
          <dd className="flex items-center gap-1.5">
            {user.email}
            {user.emailVerified && (
              <BadgeCheck className="text-success size-4" aria-label="Confirmed" />
            )}
          </dd>
        </div>
      </dl>

      {!user.emailVerified && <VerifyEmailNotice email={user.email} />}

      <SessionList />
    </div>
  );
}

function VerifyEmailNotice({ email }: { email: string }) {
  const resend = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/auth/email/verification')),
  });

  return (
    <div className="border-warning/30 bg-warning/5 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-4 py-3">
      <p className="text-[13px]">
        Confirm <strong>{email}</strong> to receive conversation alerts.
        {resend.isSuccess && <span className="text-text-muted"> A new link is on its way.</span>}
        {resend.isError && <span className="text-danger"> {errorMessage(resend.error)}</span>}
      </p>
      {!resend.isSuccess && (
        <Button
          size="sm"
          variant="outline"
          disabled={resend.isPending}
          onClick={() => resend.mutate()}
        >
          Resend link
        </Button>
      )}
    </div>
  );
}

function SessionList() {
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => unwrap(await api.GET('/api/v1/auth/sessions')),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) =>
      unwrap(await api.DELETE('/api/v1/auth/sessions/{id}', { params: { path: { id } } })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] }),
  });

  return (
    <section aria-labelledby="sessions-heading">
      <h2 id="sessions-heading" className="text-base font-semibold">
        Signed-in devices
      </h2>
      <p className="text-text-muted mt-1 text-[13px]">
        Sign out anything you don&apos;t recognise. It loses access right away.
      </p>

      {sessions.isPending && (
        <div className="mt-4 space-y-2" aria-hidden>
          {[0, 1].map((i) => (
            <div key={i} className="bg-muted h-14 animate-pulse rounded-lg" />
          ))}
        </div>
      )}
      {sessions.isError && (
        <p className="text-danger mt-4 text-[13px]">{errorMessage(sessions.error)}</p>
      )}

      {sessions.data && (
        <ul className="border-border divide-border mt-4 divide-y rounded-[10px] border">
          {sessions.data.map((session) => {
            const device = describeDevice(session.userAgent);
            const Icon = device.mobile ? Smartphone : Laptop;
            return (
              <li key={session.id} className="flex items-center gap-3 px-4 py-3">
                <Icon className="text-text-muted size-[18px] shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {device.label}
                    {session.current && (
                      <span className="bg-brand-soft text-brand ml-2 rounded-full px-2 py-0.5 text-[12px] font-medium">
                        This device
                      </span>
                    )}
                  </p>
                  <p className="text-text-muted tabular text-[12px]">
                    {session.ip ?? 'Unknown IP'} · active {formatRelative(session.lastUsedAt)}
                  </p>
                </div>
                {!session.current && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={revoke.isPending && revoke.variables === session.id}
                    onClick={() => revoke.mutate(session.id)}
                  >
                    Sign out
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
