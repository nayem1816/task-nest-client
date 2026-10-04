'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { GuestOnly } from '@/components/auth/guards';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';

// Mirrors the API's rules so most mistakes are caught before a round trip.
const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Keep it under 80 characters.'),
  email: z.email('Enter a valid email address.'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters.')
    .max(128, 'Keep it under 128 characters.'),
});

type Values = z.infer<typeof schema>;

export function SignupForm() {
  const { acceptSession } = useAuth();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const signup = useMutation({
    mutationFn: async (body: Values) => unwrap(await api.POST('/api/v1/auth/signup', { body })),
    onSuccess: acceptSession,
  });

  const { errors } = form.formState;
  const emailTaken = signup.error instanceof ApiError && signup.error.code === 'EMAIL_TAKEN';

  return (
    <GuestOnly>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => signup.mutate(values))}
        className="space-y-4"
      >
        {signup.error && (
          <FormAlert>
            {emailTaken ? (
              <>
                An account with this email already exists.{' '}
                <Link href="/login" className="text-brand font-medium hover:underline">
                  Sign in instead
                </Link>
              </>
            ) : (
              errorMessage(signup.error)
            )}
          </FormAlert>
        )}

        <FormField label="Full name" error={errors.name?.message}>
          <Input autoComplete="name" autoFocus className="h-9" {...form.register('name')} />
        </FormField>

        <FormField label="Work email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" className="h-9" {...form.register('email')} />
        </FormField>

        <FormField
          label="Password"
          error={errors.password?.message}
          hint="At least 10 characters. A short phrase works well."
        >
          <PasswordInput
            autoComplete="new-password"
            className="h-9"
            {...form.register('password')}
          />
        </FormField>

        <SubmitButton
          pending={signup.isPending || signup.isSuccess}
          pendingLabel="Creating account"
        >
          Create account
        </SubmitButton>
      </form>
    </GuestOnly>
  );
}
