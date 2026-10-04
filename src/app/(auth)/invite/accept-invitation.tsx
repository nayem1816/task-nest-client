'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HOME_PATH } from '@/components/auth/guards';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';
import { rememberWorkspaceId } from '@/lib/workspace/workspace-store';

export function AcceptInvitation() {
  const token = useSearchParams().get('token') ?? '';
  const router = useRouter();
  const { state, signOut } = useAuth();

  const preview = useQuery({
    queryKey: ['invitation', token],
    enabled: token.length > 0,
    retry: false,
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/invitations/preview', { params: { query: { token } } })),
  });

  const accept = useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/api/v1/invitations/accept', { body: { token } })),
    onSuccess: (workspace) => {
      rememberWorkspaceId(workspace.id);
      router.replace(HOME_PATH);
    },
  });

  if (!token) return <FormAlert>This invitation link is missing its token.</FormAlert>;
  if (preview.isPending || state.status === 'loading') {
    return (
      <p className="text-text-muted" role="status">
        Checking your invitation…
      </p>
    );
  }
  if (preview.isError) return <FormAlert>{errorMessage(preview.error)}</FormAlert>;

  const invitation = preview.data;
  const here = `/invite?token=${encodeURIComponent(token)}`;

  return (
    <div className="space-y-5">
      <p>
        {invitation.invitedBy ?? 'Someone'} invited <strong>{invitation.email}</strong> to join{' '}
        <strong>{invitation.organizationName}</strong> as {invitation.roleName.toLowerCase()}.
      </p>

      {accept.error && <FormAlert>{errorMessage(accept.error)}</FormAlert>}

      {state.status === 'anonymous' && (
        <div className="space-y-2">
          <Button asChild className="h-9 w-full">
            <Link
              href={`/signup?email=${encodeURIComponent(invitation.email)}&next=${encodeURIComponent(here)}`}
            >
              Create an account to join
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-9 w-full">
            <Link href={`/login?next=${encodeURIComponent(here)}`}>I already have an account</Link>
          </Button>
        </div>
      )}

      {state.status === 'authenticated' &&
        (state.user.email.toLowerCase() === invitation.email.toLowerCase() ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              accept.mutate();
            }}
          >
            <SubmitButton pending={accept.isPending || accept.isSuccess} pendingLabel="Joining">
              Join {invitation.organizationName}
            </SubmitButton>
          </form>
        ) : (
          <div className="space-y-3">
            <FormAlert>
              {`You're signed in as ${state.user.email}. This invitation is for ${invitation.email}.`}
            </FormAlert>
            <Button
              variant="outline"
              className="h-9 w-full"
              onClick={() =>
                void signOut().then(() => router.replace(`/login?next=${encodeURIComponent(here)}`))
              }
            >
              Sign out and switch account
            </Button>
          </div>
        ))}
    </div>
  );
}
