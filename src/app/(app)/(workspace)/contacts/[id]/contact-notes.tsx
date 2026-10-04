'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { formatRelative } from '@/lib/format';
import { useContactNotes } from '@/lib/queries/contacts';
import { useWorkspaceKey } from '@/lib/queries/team';

interface ContactNotesProps {
  contactId: string;
  canWrite: boolean;
  canDeleteAny: boolean;
  /** The viewer's membership id; their own notes can always be deleted. */
  memberId: string;
}

export function ContactNotes({ contactId, canWrite, canDeleteAny, memberId }: ContactNotesProps) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const notes = useContactNotes(contactId);
  const [draft, setDraft] = useState('');

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key('contacts', 'notes', contactId) }),
      queryClient.invalidateQueries({ queryKey: key('contacts', 'activity', contactId) }),
    ]);

  const add = useMutation({
    mutationFn: async (body: string) =>
      unwrap(
        await api.POST('/api/v1/contacts/{id}/notes', {
          params: { path: { id: contactId } },
          body: { body },
        }),
      ),
    onSuccess: async () => {
      setDraft('');
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const remove = useMutation({
    mutationFn: async (noteId: string) =>
      unwrap(
        await api.DELETE('/api/v1/contacts/{id}/notes/{noteId}', {
          params: { path: { id: contactId, noteId } },
        }),
      ),
    onSuccess: async () => {
      toast.success('Note deleted.');
      await refresh();
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const list = notes.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <section aria-labelledby="notes-heading" className="space-y-3">
      <h2 id="notes-heading" className="text-base font-semibold">
        Notes
      </h2>

      {canWrite && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) add.mutate(draft.trim());
          }}
          className="border-border bg-surface rounded-[10px] border p-2"
        >
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && draft.trim()) {
                e.preventDefault();
                add.mutate(draft.trim());
              }
            }}
            rows={2}
            maxLength={5000}
            placeholder="Add a note for your team. Customers never see notes."
            aria-label="New note"
            className="min-h-0 resize-none border-0 shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center justify-end gap-2 pt-1">
            <span className="text-text-muted hidden text-[12px] sm:inline">Ctrl+Enter to save</span>
            <Button type="submit" size="sm" disabled={!draft.trim() || add.isPending}>
              {add.isPending ? 'Saving…' : 'Save note'}
            </Button>
          </div>
        </form>
      )}

      {notes.isError && <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />}
      {notes.isSuccess && list.length === 0 && (
        <p className="text-text-muted text-[13px]">
          No notes yet. Notes are where the team keeps context a customer shouldn&apos;t have to
          repeat.
        </p>
      )}

      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((note) => {
            const mine = note.author?.id === memberId;
            return (
              <li
                key={note.id}
                className="border-border bg-surface group rounded-[10px] border px-3.5 py-2.5"
              >
                <p className="text-[13px] whitespace-pre-wrap">{note.body}</p>
                <div className="text-text-muted mt-1.5 flex items-center gap-2 text-[12px]">
                  <span>
                    {note.author?.name ?? 'Former member'} · {formatRelative(note.createdAt)}
                  </span>
                  {(mine || canDeleteAny) && (
                    <button
                      type="button"
                      onClick={() => remove.mutate(note.id)}
                      disabled={remove.isPending}
                      className="hover:text-danger ml-auto opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label="Delete note"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {notes.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void notes.fetchNextPage()}
          disabled={notes.isFetchingNextPage}
        >
          Show older notes
        </Button>
      )}
    </section>
  );
}
