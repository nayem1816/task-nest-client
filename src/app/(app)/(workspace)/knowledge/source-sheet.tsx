'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RotateCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { type KnowledgeSourceDetail, useKnowledgeSource } from '@/lib/queries/knowledge';
import { useWorkspaceKey } from '@/lib/queries/team';
import { StatusText } from './knowledge-page';

interface SourceSheetProps {
  id: string | null;
  onClose(): void;
  canManage: boolean;
}

export function SourceSheet({ id, onClose, canManage }: SourceSheetProps) {
  const source = useKnowledgeSource(id);

  return (
    <Sheet open={Boolean(id)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-xl">
        {source.data ? (
          <SourceDetail
            key={source.data.id}
            source={source.data}
            canManage={canManage}
            onRemoved={onClose}
          />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Source</SheetTitle>
              <SheetDescription className="sr-only">Loading</SheetDescription>
            </SheetHeader>
            <div className="px-4">
              {source.isError ? (
                <p className="text-danger text-[13px]">{errorMessage(source.error)}</p>
              ) : (
                <ListSkeleton rows={3} />
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SourceDetail({
  source,
  canManage,
  onRemoved,
}: {
  source: KnowledgeSourceDetail;
  canManage: boolean;
  onRemoved(): void;
}) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const [draft, setDraft] = useState(source.content ?? '');
  const [confirmRemove, setConfirmRemove] = useState(false);
  const editable = canManage && source.type === 'TEXT';
  const busy = source.status === 'PENDING' || source.status === 'PROCESSING';
  const refresh = () => queryClient.invalidateQueries({ queryKey: key('knowledge') });

  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.PATCH('/api/v1/knowledge/sources/{id}', {
          params: { path: { id: source.id } },
          body: { content: draft },
        }),
      ),
    onSuccess: async () => {
      await refresh();
      toast.success('Saved. Re-indexing now.');
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  const reindex = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.POST('/api/v1/knowledge/sources/{id}/reindex', {
          params: { path: { id: source.id } },
        }),
      ),
    onSuccess: () => refresh(),
    onError: (err) => toast.error(errorMessage(err)),
  });

  const remove = useMutation({
    mutationFn: async () =>
      unwrap(
        await api.DELETE('/api/v1/knowledge/sources/{id}', { params: { path: { id: source.id } } }),
      ),
    onSuccess: async () => {
      await refresh();
      toast.success(`${source.title} removed. The AI no longer uses it.`);
      onRemoved();
    },
  });

  return (
    <>
      <SheetHeader className="border-border border-b">
        <SheetTitle className="pr-6">{source.title}</SheetTitle>
        <SheetDescription>
          {source.status === 'FAILED' ? (
            <span className="text-danger">{source.error}</span>
          ) : (
            <StatusText source={source} />
          )}
        </SheetDescription>
        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-brand inline-flex items-center gap-1 text-[13px] hover:underline"
          >
            {source.url}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
        {canManage && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={busy || reindex.isPending}
              onClick={() => reindex.mutate()}
            >
              <RotateCw aria-hidden />
              Index again
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(true)}>
              <Trash2 aria-hidden />
              Remove
            </Button>
          </div>
        )}
      </SheetHeader>

      <div className="space-y-6 px-4 py-4">
        <section className="space-y-2">
          <h3 className="text-[13px] font-semibold">
            {source.type === 'TEXT'
              ? 'Text'
              : 'Text read from the ' + (source.type === 'URL' ? 'page' : 'file')}
          </h3>
          {editable ? (
            <>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={12}
                className="font-mono text-[13px]"
                aria-label="Text"
              />
              <Button
                size="sm"
                disabled={
                  draft.trim() === (source.content ?? '').trim() || !draft.trim() || save.isPending
                }
                onClick={() => save.mutate()}
              >
                {save.isPending ? 'Saving…' : 'Save and re-index'}
              </Button>
            </>
          ) : source.content ? (
            <pre className="bg-muted max-h-72 overflow-y-auto rounded-lg p-3 font-sans text-[13px] whitespace-pre-wrap">
              {source.content}
            </pre>
          ) : (
            <p className="text-text-muted text-[13px]">Not read yet.</p>
          )}
        </section>

        {source.chunks.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-[13px] font-semibold">
              Passages the AI searches ({source.chunks.length})
            </h3>
            <ol className="space-y-2">
              {source.chunks.map((chunk) => (
                <li key={chunk.position} className="border-border rounded-lg border p-3">
                  {chunk.heading && (
                    <p className="text-text-muted mb-1 text-[12px] font-medium">{chunk.heading}</p>
                  )}
                  <p className="line-clamp-5 text-[13px] leading-snug whitespace-pre-line">
                    {chunk.content}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${source.title}?`}
        impact="The AI stops using it immediately. Answers that relied on it will change."
        confirmLabel="Remove source"
        pending={remove.isPending}
        error={remove.error}
        onConfirm={() => remove.mutate()}
      />
    </>
  );
}
