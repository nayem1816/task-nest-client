'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
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

// Until the realtime connection lands, the inbox refreshes on a short interval.
const POLL_MS = 15_000;

export function useConversations(filters: InboxFilters, enabled = true) {
  const key = useWorkspaceKey();
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
    refetchInterval: POLL_MS,
    enabled,
  });
}

export function useInboxCounts() {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('inbox', 'counts'),
    queryFn: async () => unwrap(await api.GET('/api/v1/conversations/counts')),
    refetchInterval: POLL_MS,
  });
}

export function useConversation(id: string) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('inbox', 'conversation', id),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/conversations/{id}', { params: { path: { id } } })),
    refetchInterval: POLL_MS,
  });
}

export function useMessages(id: string) {
  const key = useWorkspaceKey();
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
    refetchInterval: POLL_MS,
  });
}
