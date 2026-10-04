'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useWatch } from 'react-hook-form';
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
import { errorMessage, unwrap } from '@/lib/api/errors';
import { type Role, useWorkspaceKey } from '@/lib/queries/team';

const schema = z.object({
  email: z.email('Enter a valid email address.'),
  roleId: z.string().min(1, 'Choose a role.'),
});
type Values = z.infer<typeof schema>;

interface InviteDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Roles the inviter may grant, most access first. */
  roles: Role[];
}

export function InviteDialog({ open, onOpenChange, roles }: InviteDialogProps) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const defaultRole = roles.find((r) => r.key === 'agent') ?? roles.at(-1);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', roleId: defaultRole?.id ?? '' },
  });

  const invite = useMutation({
    mutationFn: async (body: Values) => unwrap(await api.POST('/api/v1/invitations', { body })),
    onSuccess: async (invitation) => {
      await queryClient.invalidateQueries({ queryKey: key('invitations') });
      toast.success(`Invitation sent to ${invitation.email}.`);
      form.reset({ email: '', roleId: form.getValues('roleId') });
      onOpenChange(false);
    },
  });

  const roleId = useWatch({ control: form.control, name: 'roleId' });
  const selectedRole = roles.find((r) => r.id === roleId);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) invite.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>
            They&apos;ll get an email with a link that works for 7 days.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => invite.mutate(values))}
          className="space-y-4"
        >
          {invite.error && <FormAlert>{errorMessage(invite.error)}</FormAlert>}
          <FormField label="Email" error={form.formState.errors.email?.message}>
            <Input
              type="email"
              autoFocus
              placeholder="name@company.com"
              className="h-9"
              {...form.register('email')}
            />
          </FormField>
          <FormField
            label="Role"
            error={form.formState.errors.roleId?.message}
            hint={selectedRole?.description ?? undefined}
          >
            <NativeSelect {...form.register('roleId')}>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <SubmitButton pending={invite.isPending} pendingLabel="Sending">
            Send invitation
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
