'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';

const schema = z.object({ email: z.email('Enter a valid email address.') });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const request = useMutation({
    mutationFn: async (body: Values) =>
      unwrap(await api.POST('/api/v1/auth/password/forgot', { body })),
  });

  if (request.isSuccess) {
    return (
      <FormAlert tone="success">
        If an account exists for <strong>{request.variables.email}</strong>, a reset link is on its
        way. It works for one hour.
      </FormAlert>
    );
  }

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => request.mutate(values))}
      className="space-y-4"
    >
      {request.error && <FormAlert>{errorMessage(request.error)}</FormAlert>}
      <FormField label="Email" error={form.formState.errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          autoFocus
          className="h-9"
          {...form.register('email')}
        />
      </FormField>
      <SubmitButton pending={request.isPending} pendingLabel="Sending link">
        Send reset link
      </SubmitButton>
    </form>
  );
}
