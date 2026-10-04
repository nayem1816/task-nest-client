'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { GuestOnly } from '@/components/auth/guards';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PasswordInput } from '@/components/forms/password-input';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const { acceptSession } = useAuth();
  const params = useSearchParams();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const login = useMutation({
    mutationFn: async (body: Values) => unwrap(await api.POST('/api/v1/auth/login', { body })),
    // GuestOnly redirects once the session lands.
    onSuccess: acceptSession,
  });

  const { errors } = form.formState;

  return (
    <GuestOnly next={params.get('next') ?? undefined}>
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        className="space-y-4"
      >
        {params.get('reset') === '1' && !login.error && (
          <FormAlert tone="success">Password updated. Sign in with your new password.</FormAlert>
        )}
        {login.error && <FormAlert>{errorMessage(login.error)}</FormAlert>}

        <FormField label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            autoFocus
            className="h-9"
            {...form.register('email')}
          />
        </FormField>

        <FormField
          label="Password"
          error={errors.password?.message}
          aside={
            <Link href="/forgot-password" className="text-brand text-[13px] hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput
            autoComplete="current-password"
            className="h-9"
            {...form.register('password')}
          />
        </FormField>

        <SubmitButton pending={login.isPending || login.isSuccess} pendingLabel="Signing in">
          Sign in
        </SubmitButton>
      </form>
    </GuestOnly>
  );
}
