'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { type Member, type Team, useWorkspaceKey } from '@/lib/queries/team';

const schema = z.object({
  name: z.string().trim().min(1, 'Give the team a name.').max(60),
  description: z.string().trim().max(240, 'Keep it under 240 characters.'),
});
type Values = z.infer<typeof schema>;

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Edit this team; create a new one when omitted. */
  team?: Team;
}

export function TeamFormDialog({ open, onOpenChange, team }: TeamFormDialogProps) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: { name: team?.name ?? '', description: team?.description ?? '' },
  });

  const save = useMutation({
    mutationFn: async (body: Values) =>
      team
        ? unwrap(await api.PATCH('/api/v1/teams/{id}', { params: { path: { id: team.id } }, body }))
        : unwrap(await api.POST('/api/v1/teams', { body })),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: key('teams') });
      toast.success(team ? `${saved.name} updated.` : `${saved.name} created.`);
      onOpenChange(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) save.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit team' : 'New team'}</DialogTitle>
          <DialogDescription>
            Teams group people who handle the same kind of conversations.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => save.mutate(values))}
          className="space-y-4"
        >
          {save.error && <FormAlert>{errorMessage(save.error)}</FormAlert>}
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input
              autoFocus
              placeholder="Customer Care"
              className="h-9"
              {...form.register('name')}
            />
          </FormField>
          <FormField
            label="Description"
            error={form.formState.errors.description?.message}
            hint="Optional. What this team looks after."
          >
            <Textarea
              rows={3}
              placeholder="Orders, shipping, subscriptions and returns."
              {...form.register('description')}
            />
          </FormField>
          <SubmitButton pending={save.isPending} pendingLabel="Saving">
            {team ? 'Save changes' : 'Create team'}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface TeamMembersDialogProps {
  team: Team | null;
  members: Member[];
  onClose(): void;
}

export function TeamMembersDialog({ team, members, onClose }: TeamMembersDialogProps) {
  return (
    <Dialog open={team !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {team && <TeamMembersForm team={team} members={members} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function TeamMembersForm({
  team,
  members,
  onDone,
}: {
  team: Team;
  members: Member[];
  onDone(): void;
}) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const [selected, setSelected] = useState(() => new Set(team.members.map((m) => m.id)));
  const active = members.filter((m) => m.status === 'ACTIVE' || selected.has(m.id));

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.PUT('/api/v1/teams/{id}/members', {
          params: { path: { id: team.id } },
          body: { memberIds: [...selected] },
        }),
      ),
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key('teams') }),
        queryClient.invalidateQueries({ queryKey: key('members') }),
      ]);
      toast.success(
        `${saved.name} has ${saved.members.length} ${saved.members.length === 1 ? 'member' : 'members'}.`,
      );
      onDone();
    },
  });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Members of {team.name}</DialogTitle>
        <DialogDescription>Pick who belongs to this team.</DialogDescription>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
        className="space-y-4"
      >
        {save.error && <FormAlert>{errorMessage(save.error)}</FormAlert>}
        <fieldset className="border-border divide-border max-h-72 divide-y overflow-y-auto rounded-lg border">
          <legend className="sr-only">Team members</legend>
          {active.map((member) => (
            <label
              key={member.id}
              className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 px-3 py-2"
            >
              <input
                type="checkbox"
                className="accent-brand size-4"
                checked={selected.has(member.id)}
                onChange={() => toggle(member.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{member.displayName ?? member.user.name}</span>
                <span className="text-text-muted block truncate text-[12px]">
                  {member.role.name}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
        <SubmitButton pending={save.isPending} pendingLabel="Saving">
          Save members
        </SubmitButton>
      </form>
    </>
  );
}
