'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useWorkspaceKey } from './team';

export type Contact = components['schemas']['ContactDto'];
export type ContactDetail = components['schemas']['ContactDetailDto'];
export type Tag = components['schemas']['TagWithUsageDto'];
export type Note = components['schemas']['NoteDto'];
export type Activity = components['schemas']['ActivityDto'];
export type LifecycleStage = Contact['stage'];

export interface ContactFilters {
  search?: string;
  stage?: LifecycleStage;
  tagId?: string;
}

export function useContacts(filters: ContactFilters) {
  const key = useWorkspaceKey();
  return useInfiniteQuery({
    queryKey: key('contacts', 'list', JSON.stringify(filters)),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['ContactPageDto']> =>
      unwrap(
        await api.GET('/api/v1/contacts', {
          params: {
            query: {
              search: filters.search || undefined,
              stage: filters.stage,
              tagId: filters.tagId,
              cursor: pageParam,
              limit: 50,
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
  });
}

export function useContact(id: string) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('contacts', 'detail', id),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/contacts/{id}', { params: { path: { id } } })),
  });
}

export function useTags(enabled = true) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('tags'),
    queryFn: async () => unwrap(await api.GET('/api/v1/tags')),
    enabled,
  });
}

export function useContactNotes(id: string) {
  const key = useWorkspaceKey();
  return useInfiniteQuery({
    queryKey: key('contacts', 'notes', id),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['NotePageDto']> =>
      unwrap(
        await api.GET('/api/v1/contacts/{id}/notes', {
          params: { path: { id }, query: { cursor: pageParam, limit: 20 } },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useContactActivity(id: string) {
  const key = useWorkspaceKey();
  return useInfiniteQuery({
    queryKey: key('contacts', 'activity', id),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['ActivityPageDto']> =>
      unwrap(
        await api.GET('/api/v1/contacts/{id}/activity', {
          params: { path: { id }, query: { cursor: pageParam, limit: 30 } },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
