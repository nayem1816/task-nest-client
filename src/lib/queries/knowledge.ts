'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useLiveUpdates } from '@/lib/realtime/realtime-provider';
import { useWorkspaceKey } from './team';

export type KnowledgeSource = components['schemas']['KnowledgeSourceDto'];
export type KnowledgeSourceDetail = components['schemas']['KnowledgeSourceDetailDto'];
export type KnowledgeHit = components['schemas']['KnowledgeSearchResultDto'];

const isWorking = (s: { status: KnowledgeSource['status'] }) =>
  s.status === 'PENDING' || s.status === 'PROCESSING';

export function useKnowledgeSources() {
  const key = useWorkspaceKey();
  const live = useLiveUpdates();
  return useQuery({
    queryKey: key('knowledge', 'sources'),
    queryFn: async () => unwrap(await api.GET('/api/v1/knowledge/sources')),
    // Status changes arrive over the realtime connection; without it, check
    // back while something is still being indexed.
    refetchInterval: (query) => (!live && query.state.data?.some(isWorking) ? 3_000 : false),
  });
}

export function useKnowledgeSource(id: string | null) {
  const key = useWorkspaceKey();
  const live = useLiveUpdates();
  return useQuery({
    queryKey: key('knowledge', 'source', id ?? ''),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/knowledge/sources/{id}', { params: { path: { id: id! } } })),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      !live && query.state.data && isWorking(query.state.data) ? 3_000 : false,
  });
}

/** How close a passage is to the question, in words a support lead can use. */
export function matchStrength(similarity: number): {
  label: string;
  tone: 'strong' | 'fair' | 'weak';
} {
  if (similarity >= 0.7) return { label: 'Strong match', tone: 'strong' };
  if (similarity >= 0.55) return { label: 'Possible match', tone: 'fair' };
  return { label: 'Weak match', tone: 'weak' };
}
