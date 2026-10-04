'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MailPlus, MoreHorizontal, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { initials } from '@/components/shell/initials';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useAuth } from '@/lib/auth/auth-provider';
import { formatDate, formatExpiry } from '@/lib/format';
import {
  type Invitation,
  type Member,
  type Role,
  useInvitations,
  useMembers,
  useRoles,
  useWorkspaceKey,
} from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { InviteDialog } from './invite-dialog';

type PendingAction =
  | { kind: 'remove'; member: Member }
  | { kind: 'disable'; member: Member }
  | { kind: 'revoke'; invitation: Invitation };

export function MembersSettings() {
  const { current, can } = useWorkspace();
  const { state } = useAuth();
  const members = useMembers();
  const roles = useRoles();
  const canManage = can('team.manage');
  const invitations = useInvitations();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const isOwner = current?.role.key === 'owner';
  // Mirrors the API: only owners grant the owner role or change an owner.
  const grantableRoles = (roles.data ?? []).filter((r) => isOwner || r.key !== 'owner');
  const selfId = state.status === 'authenticated' ? state.user.id : null;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Members"
        description="Everyone who can open this workspace, and what they're allowed to do."
        actions={
          canManage && (
            <Button onClick={() => setInviteOpen(true)} disabled={!roles.data}>
              <UserPlus aria-hidden />
              Invite people
            </Button>
          )
        }
      />

      {members.isPending && <ListSkeleton rows={3} />}
      {members.isError && (
        <ErrorState error={members.error} onRetry={() => void members.refetch()} />
      )}
      {members.data && (
        <MembersTable
          members={members.data}
          grantableRoles={grantableRoles}
          canManage={canManage}
          isOwner={isOwner}
          selfId={selfId}
          onRemove={(member) => setPending({ kind: 'remove', member })}
          onDisable={(member) => setPending({ kind: 'disable', member })}
        />
      )}

      <section aria-labelledby="invitations-heading" className="space-y-3">
        <h2 id="invitations-heading" className="text-base font-semibold">
          Pending invitations
        </h2>
        {invitations.isPending && <ListSkeleton rows={1} />}
        {invitations.isError && (
          <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
        )}
        {invitations.data?.length === 0 && (
          <EmptyState
            icon={MailPlus}
            title="No invitations waiting"
            action={
              canManage && (
                <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                  Invite people
                </Button>
              )
            }
          >
            Invite the people who answer customers. They join with the role you pick and can start
            once they accept.
          </EmptyState>
        )}
        {invitations.data && invitations.data.length > 0 && (
          <ul className="border-border divide-border bg-surface divide-y rounded-[10px] border">
            {invitations.data.map((invitation) => (
              <li
                key={invitation.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{invitation.email}</p>
                  <p className="text-text-muted text-[12px]">
                    {invitation.role.name}
                    {invitation.invitedBy && ` · invited by ${invitation.invitedBy}`} · expires{' '}
                    {formatExpiry(invitation.expiresAt)}
                  </p>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending({ kind: 'revoke', invitation })}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canManage && roles.data && (
        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} roles={grantableRoles} />
      )}
      <PendingActionDialog action={pending} onClose={() => setPending(null)} />
    </div>
  );
}

interface MembersTableProps {
  members: Member[];
  grantableRoles: Role[];
  canManage: boolean;
  isOwner: boolean;
  selfId: string | null;
  onRemove(member: Member): void;
  onDisable(member: Member): void;
}

function MembersTable(props: MembersTableProps) {
  const { members, grantableRoles, canManage, isOwner, selfId, onRemove, onDisable } = props;
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();

  const update = useMutation({
    mutationFn: async ({ id, ...body }: { id: string; roleId?: string; status?: 'ACTIVE' }) =>
      unwrap(await api.PATCH('/api/v1/members/{id}', { params: { path: { id } }, body })),
    onSuccess: async (member, vars) => {
      await queryClient.invalidateQueries({ queryKey: key('members') });
      toast.success(
        vars.roleId
          ? `${member.user.name} is now ${article(member.role.name)} ${member.role.name.toLowerCase()}.`
          : `${member.user.name} can open the workspace again.`,
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  return (
    <div className="space-y-3">
      <div className="border-border bg-surface overflow-x-auto rounded-[10px] border">
        <table className="w-full text-left">
          <thead className="text-text-muted border-border border-b text-[12px]">
            <tr>
              <th className="px-3 py-2.5 font-medium sm:px-4">Name</th>
              <th className="px-3 py-2.5 font-medium sm:px-4">Role</th>
              <th className="hidden px-4 py-2.5 font-medium md:table-cell">Teams</th>
              <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Joined</th>
              <th className="w-10 px-2 py-2.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {members.map((member) => {
              const isSelf = member.user.id === selfId;
              const isOwnerRow = member.role.key === 'owner';
              const editable = canManage && !isSelf && (isOwner || !isOwnerRow);
              const disabled = member.status === 'DISABLED';
              return (
                <tr key={member.id} className={disabled ? 'text-text-muted' : undefined}>
                  <td className="px-3 py-2.5 sm:px-4">
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="bg-muted hidden size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:flex"
                      >
                        {initials(member.user.name)}
                      </span>
                      <div className="max-w-[40vw] min-w-0 sm:max-w-none">
                        <p className="truncate font-medium">
                          {member.displayName ?? member.user.name}
                          {isSelf && <span className="text-text-muted font-normal"> (you)</span>}
                        </p>
                        <p className="text-text-muted truncate text-[12px]">{member.user.email}</p>
                      </div>
                      {disabled && <Badge variant="outline">No access</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 sm:px-4">
                    {editable ? (
                      <NativeSelect
                        aria-label={`Role for ${member.user.name}`}
                        value={member.role.id}
                        disabled={update.isPending}
                        onChange={(e) => update.mutate({ id: member.id, roleId: e.target.value })}
                        className="h-8 w-28 text-[13px] sm:w-36"
                      >
                        {grantableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      member.role.name
                    )}
                  </td>
                  <td className="text-text-muted hidden px-4 py-2.5 text-[13px] md:table-cell">
                    {member.teams.map((t) => t.name).join(', ') || '—'}
                  </td>
                  <td className="text-text-muted tabular hidden px-4 py-2.5 text-[13px] whitespace-nowrap sm:table-cell">
                    {formatDate(member.joinedAt)}
                  </td>
                  <td className="px-2 py-2.5 text-right">
                    {editable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${member.user.name}`}
                          >
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {disabled ? (
                            <DropdownMenuItem
                              onSelect={() => update.mutate({ id: member.id, status: 'ACTIVE' })}
                            >
                              Restore access
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onSelect={() => onDisable(member)}>
                              Turn off access
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem variant="destructive" onSelect={() => onRemove(member)}>
                            Remove from workspace
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {members.length === 1 && (
        <EmptyState icon={Users} title="It's just you for now">
          Invite teammates so conversations can be shared and assigned.
        </EmptyState>
      )}
    </div>
  );
}

function PendingActionDialog({
  action,
  onClose,
}: {
  action: PendingAction | null;
  onClose(): void;
}) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();

  const run = useMutation({
    mutationFn: async (a: PendingAction) => {
      if (a.kind === 'revoke') {
        return unwrap(
          await api.DELETE('/api/v1/invitations/{id}', {
            params: { path: { id: a.invitation.id } },
          }),
        );
      }
      if (a.kind === 'remove') {
        return unwrap(
          await api.DELETE('/api/v1/members/{id}', { params: { path: { id: a.member.id } } }),
        );
      }
      return unwrap(
        await api.PATCH('/api/v1/members/{id}', {
          params: { path: { id: a.member.id } },
          body: { status: 'DISABLED' },
        }),
      );
    },
    onSuccess: async (_, a) => {
      await queryClient.invalidateQueries({
        queryKey: key(a.kind === 'revoke' ? 'invitations' : 'members'),
      });
      toast.success(
        a.kind === 'revoke'
          ? `Invitation for ${a.invitation.email} revoked.`
          : a.kind === 'remove'
            ? `${a.member.user.name} was removed.`
            : `${a.member.user.name} can no longer open this workspace.`,
      );
      run.reset();
      onClose();
    },
  });

  const close = () => {
    run.reset();
    onClose();
  };

  if (!action) return null;
  const copy =
    action.kind === 'revoke'
      ? {
          title: 'Revoke invitation?',
          impact: `The link sent to ${action.invitation.email} will stop working. You can invite them again later.`,
          confirm: 'Revoke invitation',
        }
      : action.kind === 'remove'
        ? {
            title: `Remove ${action.member.user.name}?`,
            impact: `They lose access to this workspace right away and are taken off their teams. Conversations they handled stay in the inbox. To bring them back you'll need to invite them again.`,
            confirm: 'Remove member',
          }
        : {
            title: `Turn off access for ${action.member.user.name}?`,
            impact: `They can't open this workspace until you restore access. Their role, teams and history are kept.`,
            confirm: 'Turn off access',
          };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => !open && close()}
      title={copy.title}
      impact={copy.impact}
      confirmLabel={copy.confirm}
      pending={run.isPending}
      error={run.error}
      onConfirm={() => run.mutate(action)}
    />
  );
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}
