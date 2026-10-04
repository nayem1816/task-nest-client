'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { PageHeader } from '@/components/page/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_VALUES,
  type BusinessType,
  timeZones,
} from '@/lib/workspace/business-types';
import { useWorkspace, WORKSPACES_QUERY_KEY } from '@/lib/workspace/workspace-provider';

const schema = z.object({
  name: z.string().trim().min(2, 'Use at least 2 characters.').max(60),
  businessType: z.enum(BUSINESS_TYPE_VALUES, { error: 'Pick the closest match.' }),
  timezone: z.string().min(1),
});
type Values = z.infer<typeof schema>;

export function WorkspaceSettings() {
  const { current, can } = useWorkspace();
  const queryClient = useQueryClient();
  const zones = useMemo(() => timeZones(), []);
  const editable = can('settings.manage');

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: current
      ? {
          name: current.name,
          businessType: (current.businessType ?? undefined) as BusinessType,
          timezone: current.timezone,
        }
      : undefined,
  });

  const save = useMutation({
    mutationFn: async (body: Values) =>
      unwrap(await api.PATCH('/api/v1/organizations/current', { body })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      toast.success('Workspace details saved.');
    },
  });

  if (!current) return null;
  const { errors, isDirty } = form.formState;

  return (
    <div className="space-y-6">
      <PageHeader
        title="General"
        description={
          editable
            ? 'How your workspace appears to your team and customers.'
            : 'Only admins and owners can change these.'
        }
      />

      <form
        noValidate
        onSubmit={form.handleSubmit((values) => save.mutate(values))}
        className="max-w-md space-y-4"
      >
        {save.error && <FormAlert>{errorMessage(save.error)}</FormAlert>}
        <fieldset disabled={!editable || save.isPending} className="space-y-4">
          <FormField
            label="Business name"
            error={errors.name?.message}
            hint="Customers see this in the chat widget and in emails."
          >
            <Input className="h-9" {...form.register('name')} />
          </FormField>

          <FormField label="Business type" error={errors.businessType?.message}>
            <NativeSelect {...form.register('businessType')}>
              {!current.businessType && <option value="">Choose one</option>}
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
            hint="Business hours and reports use this time zone."
          >
            <NativeSelect {...form.register('timezone')}>
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </fieldset>

        {editable && (
          <div className="flex items-center gap-2 pt-1">
            <Button type="submit" disabled={!isDirty || save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {isDirty && !save.isPending && (
              <Button type="button" variant="ghost" onClick={() => form.reset()}>
                Discard
              </Button>
            )}
          </div>
        )}
      </form>

      <dl className="text-text-muted border-border max-w-md space-y-1 border-t pt-4 text-[13px]">
        <div className="flex gap-2">
          <dt>Workspace URL name:</dt>
          <dd className="text-text font-mono text-[12px]">{current.slug}</dd>
        </div>
        <div className="flex gap-2">
          <dt>Workspace ID:</dt>
          <dd className="text-text font-mono text-[12px]">{current.id}</dd>
        </div>
      </dl>
    </div>
  );
}
