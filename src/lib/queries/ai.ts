'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useWorkspaceKey } from './team';

export type AiStatus = components['schemas']['AiStatusDto'];
export type AiUsage = components['schemas']['AiUsageSummaryDto'];

export function useAiStatus() {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('ai', 'status'),
    queryFn: async () => unwrap(await api.GET('/api/v1/ai/status')),
  });
}

export function useAiUsage(days: number) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('ai', 'usage', String(days)),
    queryFn: async () => unwrap(await api.GET('/api/v1/ai/usage', { params: { query: { days } } })),
  });
}

/** Readable names for the `feature` recorded with each AI call. */
export const AI_FEATURE_LABELS: Record<string, string> = {
  'ai.check': 'Connection checks',
  'agent.reply': 'AI replies to customers',
  'knowledge.embed': 'Knowledge indexing',
  'knowledge.search': 'Knowledge search',
  playground: 'Playground',
};
