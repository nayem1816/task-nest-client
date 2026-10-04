'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, unwrap } from '@/lib/api/errors';

const schema = z
  .object({
    password: z.string().min(10, 'Use at least 10 characters.').max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: "The passwords don't match.",
  });

type Values = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get('token');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  const reset = useMutation({
    mutationFn: async ({ password }: Values) =>
      unwrap(
        await api.POST('/api/v1/auth/password/reset', { body: { token: token ?? '', password } }),
      ),
    onSuccess: () => router.replace('/login?reset=1'),
  });

  const linkInvalid =
    !token || (reset.error instanceof ApiError && reset.error.code === 'INVALID_OR_EXPIRED_LINK');

  if (linkInvalid) {
    return (
      <FormAlert>
        This reset link is invalid or has expired.{' '}
        <Link href="/forgot-password" className="text-brand font-medium hover:underline">
          Request a new one
        </Link>
      </FormAlert>
    );
  }

  const { errors } = form.formState;
  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => reset.mutate(values))}
      className="space-y-4"
    >
      {reset.error && <FormAlert>{errorMessage(reset.error)}</FormAlert>}
      <FormField
        label="New password"
        error={errors.password?.message}
        hint="At least 10 characters. You'll be signed out on your other devices."
      >
        <PasswordInput
          autoComplete="new-password"
          autoFocus
          className="h-9"
          {...form.register('password')}
        />
      </FormField>
      <FormField label="Confirm new password" error={errors.confirm?.message}>
        <PasswordInput autoComplete="new-password" className="h-9" {...form.register('confirm')} />
      </FormField>
      <SubmitButton pending={reset.isPending || reset.isSuccess} pendingLabel="Saving">
        Set new password
      </SubmitButton>
    </form>
  );
}
