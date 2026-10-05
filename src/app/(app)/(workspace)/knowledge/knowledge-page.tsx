'use client';

import { useMutation } from '@tanstack/react-query';
import { BookOpen, FileText, Globe, PenLine, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { formatRelative } from '@/lib/format';
import { useAiStatus } from '@/lib/queries/ai';
import {
  type KnowledgeHit,
  type KnowledgeSource,
  matchStrength,
  useKnowledgeSources,
} from '@/lib/queries/knowledge';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { AddSourceDialog } from './add-source-dialog';
import { SourceSheet } from './source-sheet';

export const TYPE_ICONS = { TEXT: PenLine, URL: Globe, FILE: FileText } as const;

export function KnowledgePage() {
  const { can } = useWorkspace();
  const sources = useKnowledgeSources();
  const ai = useAiStatus();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const canManage = can('knowledge.manage');

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Knowledge"
        description="What the AI answers from. It only uses what is here, so keep it current."
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)}>
              <Plus aria-hidden />
              Add source
            </Button>
          )
        }
      />

      {ai.data && !ai.data.configured && (
        <p className="rounded-[10px] border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          AI is not set up on this server, so new sources cannot be read yet. You can still add
          them; they will be indexed once AI is connected.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Sources">
          {sources.isPending && <ListSkeleton rows={4} />}
          {sources.isError && (
            <ErrorState error={sources.error} onRetry={() => void sources.refetch()} />
          )}
          {sources.data?.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title="Nothing here yet"
              action={
                canManage && (
                  <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
                    Add your first source
                  </Button>
                )
              }
            >
              Start with what customers ask most: shipping, returns, opening hours. Write it here,
              link a page from your site, or upload a document.
            </EmptyState>
          )}
          {sources.data && sources.data.length > 0 && (
            <ul className="border-border bg-surface divide-border divide-y rounded-[10px] border">
              {sources.data.map((source) => (
                <SourceRow key={source.id} source={source} onOpen={() => setOpenId(source.id)} />
              ))}
            </ul>
          )}
        </section>

        <TryQuestion hasSources={Boolean(sources.data?.some((s) => s.status === 'READY'))} />
      </div>

      {canManage && <AddSourceDialog open={adding} onOpenChange={setAdding} onAdded={setOpenId} />}
      <SourceSheet id={openId} onClose={() => setOpenId(null)} canManage={canManage} />
    </div>
  );
}

function SourceRow({ source, onOpen }: { source: KnowledgeSource; onOpen: () => void }) {
  const Icon = TYPE_ICONS[source.type];
  const origin =
    source.type === 'URL'
      ? hostOf(source.url)
      : source.type === 'FILE'
        ? source.fileName
        : 'Written here';

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="hover:bg-muted/60 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors"
      >
        <Icon className="text-text-muted mt-0.5 size-4 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-medium">{source.title}</span>
            <span className="text-text-muted truncate text-[12px]">{origin}</span>
          </div>
          {source.status === 'FAILED' && source.error ? (
            <p className="text-danger mt-0.5 text-[13px]">{source.error}</p>
          ) : (
            <p className="text-text-muted mt-0.5 text-[13px]">
              <StatusText source={source} />
            </p>
          )}
        </div>
        <StatusDot status={source.status} />
      </button>
    </li>
  );
}

export function StatusText({ source }: { source: KnowledgeSource }) {
  switch (source.status) {
    case 'PENDING':
      return 'Waiting to be read…';
    case 'PROCESSING':
      return 'Reading and indexing…';
    case 'FAILED':
      return 'Could not be indexed';
    case 'READY':
      return `${source.chunkCount} passage${source.chunkCount === 1 ? '' : 's'} · updated ${
        source.lastIndexedAt ? formatRelative(source.lastIndexedAt) : 'just now'
      }`;
  }
}

function StatusDot({ status }: { status: KnowledgeSource['status'] }) {
  const label = { PENDING: 'Waiting', PROCESSING: 'Indexing', READY: 'Ready', FAILED: 'Failed' }[
    status
  ];
  return (
    <span className="text-text-muted mt-1 flex shrink-0 items-center gap-1.5 text-[12px]">
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          status === 'READY' && 'bg-green-500',
          status === 'FAILED' && 'bg-red-500',
          (status === 'PENDING' || status === 'PROCESSING') && 'animate-pulse bg-amber-400',
        )}
      />
      {label}
    </span>
  );
}

function TryQuestion({ hasSources }: { hasSources: boolean }) {
  const [query, setQuery] = useState('');
  const search = useMutation({
    mutationFn: async (q: string) =>
      unwrap(await api.POST('/api/v1/knowledge/search', { body: { query: q, limit: 4 } })),
  });

  return (
    <aside className="border-border bg-surface h-fit space-y-3 rounded-[10px] border p-4 lg:sticky lg:top-6">
      <div>
        <h2 className="text-[15px] font-semibold">Try a question</h2>
        <p className="text-text-muted mt-0.5 text-[13px]">
          See which passages the AI would read before answering.
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          if (q) search.mutate(q);
        }}
        className="flex gap-2"
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Do you ship to Canada?"
          aria-label="Question"
          maxLength={1000}
          className="h-9"
          disabled={!hasSources}
        />
        <Button type="submit" variant="outline" disabled={!hasSources || search.isPending}>
          <Search aria-hidden />
          <span className="sr-only sm:not-sr-only">Search</span>
        </Button>
      </form>
      {!hasSources && (
        <p className="text-text-muted text-[13px]">Available once a source is ready.</p>
      )}
      {search.isError && <p className="text-danger text-[13px]">{errorMessage(search.error)}</p>}
      {search.data?.length === 0 && (
        <p className="text-text-muted text-[13px]">
          Nothing in the knowledge base matches. The AI would say it does not know.
        </p>
      )}
      {search.data && search.data.length > 0 && (
        <ol className="space-y-2">
          {search.data.map((hit) => (
            <HitCard key={hit.chunkId} hit={hit} />
          ))}
        </ol>
      )}
    </aside>
  );
}

function HitCard({ hit }: { hit: KnowledgeHit }) {
  const strength = matchStrength(hit.similarity);
  return (
    <li className="border-border rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2 text-[12px]">
        <span className="truncate font-medium">{hit.heading ?? hit.sourceTitle}</span>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 font-medium',
            strength.tone === 'strong' && 'bg-green-50 text-green-700',
            strength.tone === 'fair' && 'bg-amber-50 text-amber-800',
            strength.tone === 'weak' && 'bg-slate-100 text-slate-600',
          )}
        >
          {strength.label}
        </span>
      </div>
      {hit.heading && <p className="text-text-muted text-[12px]">{hit.sourceTitle}</p>}
      <p className="mt-1.5 line-clamp-4 text-[13px] leading-snug whitespace-pre-line">
        {hit.content}
      </p>
    </li>
  );
}

function hostOf(url: string | null): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
  } catch {
    return url;
  }
}
