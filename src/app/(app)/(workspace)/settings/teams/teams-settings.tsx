'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Plus, UsersRound } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import { type Team, useMembers, useTeams, useWorkspaceKey } from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { TeamFormDialog, TeamMembersDialog } from './team-dialogs';

export function TeamsSettings() {
  const { can } = useWorkspace();
  const canManage = can('team.manage');
  const teams = useTeams();
  const members = useMembers();
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Team | undefined>();
  const [staffing, setStaffing] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState<Team | null>(null);

  const remove = useMutation({
    mutationFn: async (team: Team) =>
      unwrap(await api.DELETE('/api/v1/teams/{id}', { params: { path: { id: team.id } } })),
    onSuccess: async (_, team) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key('teams') }),
        queryClient.invalidateQueries({ queryKey: key('members') }),
      ]);
      toast.success(`${team.name} deleted.`);
      setDeleting(null);
    },
  });

  const openCreate = () => {
    setEditing(undefined);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Group people by what they handle. Conversations can be assigned to a team from the inbox."
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus aria-hidden />
              New team
            </Button>
          )
        }
      />

      {teams.isPending && <ListSkeleton rows={2} />}
      {teams.isError && <ErrorState error={teams.error} onRetry={() => void teams.refetch()} />}
      {teams.data?.length === 0 && (
        <EmptyState
          icon={UsersRound}
          title="No teams yet"
          action={
            canManage && (
              <Button variant="outline" size="sm" onClick={openCreate}>
                Create a team
              </Button>
            )
          }
        >
          A small business can work without teams. Add them when different people handle different
          kinds of questions, like orders and wholesale.
        </EmptyState>
      )}

      {teams.data && teams.data.length > 0 && (
        <ul className="border-border divide-border bg-surface divide-y rounded-[10px] border">
          {teams.data.map((team) => (
            <li key={team.id} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{team.name}</p>
                {team.description && (
                  <p className="text-text-muted text-[13px]">{team.description}</p>
                )}
                <p className="text-text-muted mt-1 text-[12px]">
                  {team.members.length === 0
                    ? 'No members yet'
                    : team.members.map((m) => m.name).join(', ')}
                </p>
              </div>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${team.name}`}>
                      <MoreHorizontal aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setStaffing(team)} disabled={!members.data}>
                      Choose members
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        setEditing(team);
                        setFormOpen(true);
                      }}
                    >
                      Rename or describe
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(team)}>
                      Delete team
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <>
          <TeamFormDialog open={formOpen} onOpenChange={setFormOpen} team={editing} />
          <TeamMembersDialog
            team={staffing}
            members={members.data ?? []}
            onClose={() => setStaffing(null)}
          />
          <ConfirmDialog
            open={deleting !== null}
            onOpenChange={(open) => {
              if (!open) {
                remove.reset();
                setDeleting(null);
              }
            }}
            title={`Delete ${deleting?.name ?? 'team'}?`}
            impact="The team is removed for everyone. Its members stay in the workspace with the same roles."
            confirmLabel="Delete team"
            pending={remove.isPending}
            error={remove.error}
            onConfirm={() => deleting && remove.mutate(deleting)}
          />
        </>
      )}
    </div>
  );
}
