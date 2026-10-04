'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { readStoredWorkspaceId, rememberWorkspaceId, setWorkspaceId } from './workspace-store';

export type Workspace = components['schemas']['MyOrganizationDto'];

export const CREATE_WORKSPACE_PATH = '/onboarding/workspace';
export const WORKSPACES_QUERY_KEY = ['organizations', 'mine'] as const;

interface WorkspaceContextValue {
  workspaces: Workspace[];
  /** Null only on the create-workspace screen of someone with no workspace yet. */
  current: Workspace | null;
  switchTo(id: string): void;
  can(permission: string): boolean;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(readStoredWorkspaceId);

  const query = useQuery({
    queryKey: WORKSPACES_QUERY_KEY,
    queryFn: async () => unwrap(await api.GET('/api/v1/organizations')),
  });

  const workspaces = useMemo(() => query.data ?? [], [query.data]);
  // A stored id the user no longer belongs to falls back to their first workspace.
  const current = workspaces.find((w) => w.id === selectedId) ?? workspaces[0] ?? null;

  // Keep the request layer in step before any child component issues a query.
  setWorkspaceId(current?.id ?? null);

  const onCreatePage = pathname === CREATE_WORKSPACE_PATH;
  useEffect(() => {
    if (query.isSuccess && workspaces.length === 0 && !onCreatePage) {
      router.replace(CREATE_WORKSPACE_PATH);
    }
  }, [query.isSuccess, workspaces.length, onCreatePage, router]);

  const switchTo = useCallback(
    (id: string) => {
      setWorkspaceId(id);
      rememberWorkspaceId(id);
      setSelectedId(id);
      // Everything cached so far belongs to the previous workspace, except the
      // account itself and the list of workspaces.
      queryClient.removeQueries({
        predicate: ({ queryKey: [scope, name] }) =>
          scope !== 'auth' &&
          !(scope === WORKSPACES_QUERY_KEY[0] && name === WORKSPACES_QUERY_KEY[1]),
      });
    },
    [queryClient],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      current,
      switchTo,
      can: (permission) => current?.permissions.includes(permission) ?? false,
    }),
    [workspaces, current, switchTo],
  );

  if (query.isPending) return <WorkspaceLoading />;
  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="font-medium">We couldn&apos;t load your workspaces.</p>
        <p className="text-text-muted text-[13px]">{errorMessage(query.error)}</p>
        <button
          type="button"
          onClick={() => void query.refetch()}
          className="text-brand text-[13px] font-medium hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!current && !onCreatePage) return <WorkspaceLoading />;

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error('useWorkspace must be used inside <WorkspaceProvider>');
  return ctx;
}

function WorkspaceLoading() {
  return (
    <div className="flex flex-1 items-center justify-center" role="status">
      <span className="border-border border-t-brand size-5 animate-spin rounded-full border-2" />
      <span className="sr-only">Opening your workspace</span>
    </div>
  );
}
