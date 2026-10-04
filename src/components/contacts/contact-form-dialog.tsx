'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, unwrap } from '@/lib/api/errors';
import type { ContactDetail } from '@/lib/queries/contacts';
import { useWorkspaceKey } from '@/lib/queries/team';
import { STAGE_LABELS } from './contact-badges';

const schema = z
  .object({
    name: z.string().trim().max(120),
    email: z.union([z.literal(''), z.email('Enter a valid email address.')]),
    phone: z
      .string()
      .trim()
      .refine((v) => v === '' || /^[+\d][\d\s().-]{5,24}$/.test(v), 'Enter a valid phone number.'),
    company: z.string().trim().max(120),
    location: z.string().trim().max(120),
    stage: z.enum(['VISITOR', 'LEAD', 'CUSTOMER']),
  })
  .refine((v) => v.name || v.email || v.phone, {
    path: ['name'],
    message: 'Add at least a name, email or phone number.',
  });

type Values = z.infer<typeof schema>;

interface ContactFormDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Edit this contact; create a new one when omitted. */
  contact?: ContactDetail;
  onSaved?(contact: ContactDetail): void;
}

export function ContactFormDialog({
  open,
  onOpenChange,
  contact,
  onSaved,
}: ContactFormDialogProps) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: contact?.name ?? '',
      email: contact?.email ?? '',
      phone: contact?.phone ?? '',
      company: contact?.company ?? '',
      location: contact?.location ?? '',
      stage: contact?.stage ?? 'LEAD',
    },
  });

  const save = useMutation({
    mutationFn: async (body: Values) =>
      contact
        ? unwrap(
            await api.PATCH('/api/v1/contacts/{id}', {
              params: { path: { id: contact.id } },
              body,
            }),
          )
        : unwrap(await api.POST('/api/v1/contacts', { body })),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: key('contacts') });
      toast.success(contact ? 'Contact updated.' : `${saved.displayName} added.`);
      onOpenChange(false);
      onSaved?.(saved);
    },
  });

  const existingId =
    save.error instanceof ApiError && save.error.code === 'CONTACT_EMAIL_TAKEN'
      ? (save.error.details as { contactId?: string } | undefined)?.contactId
      : undefined;
  const { errors } = form.formState;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) save.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit contact' : 'New contact'}</DialogTitle>
          <DialogDescription>
            {contact
              ? 'Changes are recorded on the contact’s timeline.'
              : 'Add someone you’ve been in touch with outside TaskNest.'}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
          className="space-y-4"
        >
          {save.error && (
            <FormAlert>
              {existingId ? (
                <>
                  Another contact already uses this email.{' '}
                  <Link
                    href={`/contacts/${existingId}`}
                    className="text-brand font-medium hover:underline"
                    onClick={() => onOpenChange(false)}
                  >
                    Open that contact
                  </Link>
                </>
              ) : (
                errorMessage(save.error)
              )}
            </FormAlert>
          )}

          <FormField label="Name" error={errors.name?.message}>
            <Input
              autoFocus
              className="h-9"
              placeholder="Sarah Mitchell"
              {...form.register('name')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Email" error={errors.email?.message}>
              <Input type="email" className="h-9" {...form.register('email')} />
            </FormField>
            <FormField label="Phone" error={errors.phone?.message}>
              <Input type="tel" className="h-9" {...form.register('phone')} />
            </FormField>
            <FormField label="Company" error={errors.company?.message}>
              <Input className="h-9" {...form.register('company')} />
            </FormField>
            <FormField label="Location" error={errors.location?.message}>
              <Input className="h-9" placeholder="Austin, TX" {...form.register('location')} />
            </FormField>
          </div>
          <FormField label="Stage" hint="Where this person is in their relationship with you.">
            <NativeSelect {...form.register('stage')}>
              {(['VISITOR', 'LEAD', 'CUSTOMER'] as const).map((stage) => (
                <option key={stage} value={stage}>
                  {STAGE_LABELS[stage]}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <SubmitButton pending={save.isPending} pendingLabel="Saving">
            {contact ? 'Save changes' : 'Add contact'}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
