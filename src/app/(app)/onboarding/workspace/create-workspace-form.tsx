'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { HOME_PATH } from '@/components/auth/guards';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_VALUES,
  browserTimeZone,
  timeZones,
} from '@/lib/workspace/business-types';
import { useWorkspace, WORKSPACES_QUERY_KEY } from '@/lib/workspace/workspace-provider';

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters.')
    .max(60, 'Keep it under 60 characters.'),
  businessType: z.enum(BUSINESS_TYPE_VALUES, { error: 'Pick the closest match.' }),
  timezone: z.string().min(1),
});

type Values = z.infer<typeof schema>;

export function CreateWorkspaceForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { switchTo } = useWorkspace();
  const zones = useMemo(() => timeZones(), []);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', businessType: undefined, timezone: browserTimeZone() },
  });

  const create = useMutation({
    mutationFn: async (body: Values) => unwrap(await api.POST('/api/v1/organizations', { body })),
    onSuccess: async (workspace) => {
      await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      switchTo(workspace.id);
      router.replace(HOME_PATH);
    },
  });

  const { errors } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit((values) => create.mutate(values))}
      className="space-y-4"
    >
      {create.error && <FormAlert>{errorMessage(create.error)}</FormAlert>}

      <FormField
        label="Business name"
        error={errors.name?.message}
        hint="Customers see this in the chat widget and in emails."
      >
        <Input
          autoFocus
          placeholder="Northstar Coffee"
          className="h-9"
          {...form.register('name')}
        />
      </FormField>

      <FormField label="What kind of business is it?" error={errors.businessType?.message}>
        <NativeSelect defaultValue="" {...form.register('businessType')}>
          <option value="" disabled>
            Choose one
          </option>
          {BUSINESS_TYPE_VALUES.map((value) => (
            <option key={value} value={value}>
              {BUSINESS_TYPE_LABELS[value]}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <FormField
        label="Time zone"
        error={errors.timezone?.message}
        hint="Used for business hours and reports. Detected from your browser."
      >
        <NativeSelect {...form.register('timezone')}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replaceAll('_', ' ')}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <SubmitButton
        pending={create.isPending || create.isSuccess}
        pendingLabel="Creating workspace"
      >
        Create workspace
      </SubmitButton>
    </form>
  );
}
