'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { formatDateTime } from '@/lib/format';
import { useWorkspaceKey } from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { AUDIT_ACTIONS, describeEntry } from './describe-entry';

const PAGE_SIZE = 50;

type AuditPage = components['schemas']['AuditLogPageDto'];

export function AuditLog() {
  const { can } = useWorkspace();
  const key = useWorkspaceKey();
  const [action, setAction] = useState('');

  const log = useInfiniteQuery({
    queryKey: key('audit-log', action),
    enabled: can('audit.read'),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<AuditPage> =>
      unwrap(
        await api.GET('/api/v1/audit-logs', {
          params: {
            query: { limit: PAGE_SIZE, cursor: pageParam, action: action || undefined },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  if (!can('audit.read')) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit log" />
        <EmptyState icon={ScrollText} title="Owners, admins and managers only">
          The audit log shows who changed roles, invited people and edited settings. Ask an admin if
          you need to see it.
        </EmptyState>
      </div>
    );
  }

  const entries = log.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Changes to people, teams and settings in this workspace. Entries can't be edited or deleted."
        actions={
          <NativeSelect
            aria-label="Filter by action"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="h-8 w-52 text-[13px]"
          >
            <option value="">All activity</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </NativeSelect>
        }
      />

      {log.isPending && <ListSkeleton rows={6} />}
      {log.isError && <ErrorState error={log.error} onRetry={() => void log.refetch()} />}
      {log.isSuccess && entries.length === 0 && (
        <EmptyState
          icon={ScrollText}
          title={action ? 'Nothing matches that filter' : 'No activity yet'}
        >
          {action
            ? 'Try another action, or show all activity.'
            : 'When someone changes a role, invites a teammate or edits settings, it shows up here.'}
        </EmptyState>
      )}

      {entries.length > 0 && (
        <ol className="border-border divide-border bg-surface divide-y rounded-[10px] border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 px-4 py-2.5"
            >
              <p className="min-w-0 flex-1">{describeEntry(entry)}</p>
              <p className="text-text-muted tabular shrink-0 text-[12px]">
                {formatDateTime(entry.createdAt)}
                {entry.ip && <span className="hidden sm:inline"> · {entry.ip}</span>}
              </p>
            </li>
          ))}
        </ol>
      )}

      {log.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void log.fetchNextPage()}
          disabled={log.isFetchingNextPage}
        >
          {log.isFetchingNextPage ? 'Loading…' : 'Load older entries'}
        </Button>
      )}
    </div>
  );
}
