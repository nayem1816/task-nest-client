'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useLiveUpdates } from '@/lib/realtime/realtime-provider';
import { useWorkspaceKey } from './team';

export type Conversation = components['schemas']['ConversationDto'];
export type Message = components['schemas']['MessageDto'];
export type InboxCounts = components['schemas']['InboxCountsDto'];
export type ConversationStatus = Conversation['status'];
export type ConversationPriority = Conversation['priority'];
export type InboxView = 'all' | 'mine' | 'unassigned' | 'team';

export interface InboxFilters {
  view: InboxView;
  status: 'open' | 'all' | ConversationStatus;
  handler?: Conversation['handler'];
  priority?: 'high';
  unread?: boolean;
  search?: string;
  contactId?: string;
}

// Only used while the realtime connection is down; when it is live, events
// tell React Query what to refetch.
const POLL_MS = 15_000;

function usePollInterval(): number | false {
  return useLiveUpdates() ? false : POLL_MS;
}

export function useConversations(filters: InboxFilters, enabled = true) {
  const key = useWorkspaceKey();
  const poll = usePollInterval();
  return useInfiniteQuery({
    queryKey: key('inbox', 'list', JSON.stringify(filters)),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['ConversationPageDto']> =>
      unwrap(
        await api.GET('/api/v1/conversations', {
          params: {
            query: {
              view: filters.view,
              status: filters.status,
              handler: filters.handler,
              priority: filters.priority,
              unread: filters.unread || undefined,
              search: filters.search || undefined,
              contactId: filters.contactId,
              cursor: pageParam,
              limit: 30,
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
    refetchInterval: poll,
    enabled,
  });
}

export function useInboxCounts() {
  const key = useWorkspaceKey();
  const poll = usePollInterval();
  return useQuery({
    queryKey: key('inbox', 'counts'),
    queryFn: async () => unwrap(await api.GET('/api/v1/conversations/counts')),
    refetchInterval: poll,
  });
}

export function useConversation(id: string) {
  const key = useWorkspaceKey();
  const poll = usePollInterval();
  return useQuery({
    queryKey: key('inbox', 'conversation', id),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/conversations/{id}', { params: { path: { id } } })),
    refetchInterval: poll,
  });
}

export function useMessages(id: string) {
  const key = useWorkspaceKey();
  const poll = usePollInterval();
  return useInfiniteQuery({
    queryKey: key('inbox', 'messages', id),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['MessagePageDto']> =>
      unwrap(
        await api.GET('/api/v1/conversations/{id}/messages', {
          params: { path: { id }, query: { before: pageParam, limit: 50 } },
        }),
      ),
    getNextPageParam: (last) => last.nextBefore ?? undefined,
    refetchInterval: poll,
  });
}
