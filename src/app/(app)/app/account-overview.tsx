'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Laptop, LogOut, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { describeDevice, formatRelative } from './session-format';

export function AccountOverview() {
  const { state, signOut } = useAuth();
  if (state.status !== 'authenticated') return null;
  const { user } = state;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
          <p className="text-text-muted mt-1">{user.email}</p>
        </div>
        <Button variant="outline" onClick={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </div>

      {!user.emailVerified && <VerifyEmailNotice email={user.email} />}

      <WorkspaceSummary />

      <SessionList />
    </main>
  );
}

function WorkspaceSummary() {
  const { current, workspaces, switchTo } = useWorkspace();
  if (!current) return null;

  return (
    <section className="border-border mt-8 border-t pt-6" aria-labelledby="workspace-heading">
      <h2 id="workspace-heading" className="text-base font-semibold">
        {current.name}
      </h2>
      <p className="text-text-muted mt-1 text-[13px]">
        Your role here: {current.role.name}. The inbox and AI agent will show up in this workspace
        as they ship.
      </p>

      {workspaces.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-2" aria-label="Switch workspace">
          {workspaces
            .filter((w) => w.id !== current.id)
            .map((w) => (
              <li key={w.id}>
                <Button size="sm" variant="outline" onClick={() => switchTo(w.id)}>
                  Switch to {w.name}
                </Button>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}

function VerifyEmailNotice({ email }: { email: string }) {
  const resend = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/auth/email/verification')),
  });

  return (
    <div className="border-warning/30 bg-warning/5 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border px-4 py-3">
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
    <section className="mt-8" aria-labelledby="sessions-heading">
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
