'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

export type Member = components['schemas']['MemberDto'];
export type Role = components['schemas']['RoleDto'];
export type Team = components['schemas']['TeamDto'];
export type Invitation = components['schemas']['InvitationDto'];

/** Query keys start with the workspace id, so data never leaks across a switch. */
export function useWorkspaceKey() {
  const { current } = useWorkspace();
  return (...parts: string[]) => [current?.id ?? 'none', ...parts];
}

export function useMembers(enabled = true) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('members'),
    queryFn: async () => unwrap(await api.GET('/api/v1/members')),
    enabled,
  });
}

export function useRoles() {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('roles'),
    queryFn: async () => unwrap(await api.GET('/api/v1/roles')),
    staleTime: 5 * 60_000,
  });
}

export function useTeams() {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('teams'),
    queryFn: async () => unwrap(await api.GET('/api/v1/teams')),
  });
}

export function useInvitations(enabled = true) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('invitations'),
    queryFn: async () => unwrap(await api.GET('/api/v1/invitations')),
    enabled,
  });
}

export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => unwrap(await api.GET('/api/v1/permissions')),
    staleTime: Infinity,
  });
}
