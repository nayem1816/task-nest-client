'use client';

import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { HOME_PATH } from '@/components/auth/guards';
import { FormAlert } from '@/components/forms/form-alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';

export function VerifyEmail() {
  const token = useSearchParams().get('token');
  const { state, updateUser } = useAuth();
  const started = useRef(false);

  const verify = useMutation({
    mutationFn: async (value: string) =>
      unwrap(await api.POST('/api/v1/auth/email/verify', { body: { token: value } })),
  });

  // The link is the user's confirmation, so submit as soon as the page opens.
  // The ref keeps React's dev double-invoke from spending the token twice.
  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate(token);
    }
  }, [token, verify]);

  useEffect(() => {
    if (verify.isSuccess && state.status === 'authenticated' && !state.user.emailVerified) {
      updateUser({ ...state.user, emailVerified: true });
    }
  }, [verify.isSuccess, state, updateUser]);

  const resend = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/auth/email/verification')),
  });

  if (!token || verify.isError) {
    return (
      <div className="space-y-4">
        <FormAlert>
          {token ? errorMessage(verify.error) : 'This link is missing its token.'}
        </FormAlert>
        {state.status === 'authenticated' &&
          (resend.isSuccess ? (
            <FormAlert tone="success">A new link is on its way to {state.user.email}.</FormAlert>
          ) : (
            <Button
              variant="outline"
              className="h-9 w-full"
              disabled={resend.isPending}
              onClick={() => resend.mutate()}
            >
              Send a new link
            </Button>
          ))}
      </div>
    );
  }

  if (verify.isSuccess) {
    return (
      <div className="space-y-4">
        <FormAlert tone="success">
          Your email is confirmed. Conversation alerts and account notices will go there.
        </FormAlert>
        <Button asChild className="h-9 w-full">
          <Link href={state.status === 'authenticated' ? HOME_PATH : '/login'}>Continue</Link>
        </Button>
      </div>
    );
  }

  return (
    <p className="text-text-muted" role="status">
      Confirming your email…
    </p>
  );
}
