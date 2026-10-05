'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Lock, SendHorizontal } from 'lucide-react';
import { forwardRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useWorkspaceKey } from '@/lib/queries/team';
import { useRealtime, useTypingNames } from '@/lib/realtime/realtime-provider';
import { describeTyping } from '@/lib/realtime/typing-store';
import { cn } from '@/lib/utils';

type Mode = 'reply' | 'note';

interface ComposerProps {
  conversationId: string;
  contactName: string;
  /** Without conversation.reply the composer is replaced by an explanation. */
  canReply: boolean;
  /** Shown under the composer when replies cannot reach the customer yet. */
  deliveryNote?: string;
}

export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  { conversationId, contactName, canReply, deliveryNote },
  textareaRef,
) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const realtime = useRealtime();
  const typingNote = describeTyping(useTypingNames(conversationId));
  const [mode, setMode] = useState<Mode>('reply');
  // Drafts are kept per conversation while switching between them.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draft = drafts[`${conversationId}:${mode}`] ?? '';
  const setDraft = (value: string) =>
    setDrafts((d) => ({ ...d, [`${conversationId}:${mode}`]: value }));

  const send = useMutation({
    mutationFn: async ({ body, internal }: { body: string; internal: boolean }) =>
      unwrap(
        await api.POST('/api/v1/conversations/{id}/messages', {
          params: { path: { id: conversationId } },
          body: { body, internal },
        }),
      ),
    onSuccess: async () => {
      setDraft('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: key('inbox', 'messages', conversationId) }),
        queryClient.invalidateQueries({ queryKey: key('inbox', 'conversation', conversationId) }),
        queryClient.invalidateQueries({ queryKey: key('inbox', 'list') }),
        queryClient.invalidateQueries({ queryKey: key('inbox', 'counts') }),
      ]);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!canReply) {
    return (
      <div className="border-border bg-surface text-text-muted border-t px-4 py-3 text-center text-[13px]">
        Your role can read conversations but not reply.
      </div>
    );
  }

  const submit = () => {
    const body = draft.trim();
    if (body && !send.isPending) send.mutate({ body, internal: mode === 'note' });
  };

  return (
    <div className="border-border bg-surface border-t px-3 pt-2 pb-3 sm:px-4">
      <div className="mb-2 flex items-center gap-2">
        <div role="tablist" aria-label="Message type" className="flex gap-1">
          {(['reply', 'note'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                'flex h-7 items-center gap-1 rounded-md px-2 text-[12px] font-medium',
                mode === m
                  ? m === 'note'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-muted text-text'
                  : 'text-text-muted hover:text-text',
              )}
            >
              {m === 'note' && <Lock className="size-3" aria-hidden />}
              {m === 'reply' ? 'Reply' : 'Internal note'}
            </button>
          ))}
        </div>
        <span aria-live="polite" className="text-text-muted ml-auto truncate text-[12px]">
          {typingNote}
        </span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cn(
          'focus-within:ring-ring/40 rounded-[10px] border focus-within:ring-3',
          mode === 'note' ? 'border-amber-200 bg-amber-50/60' : 'border-input',
        )}
      >
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) realtime?.sendTyping(conversationId);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          maxLength={10_000}
          aria-label={mode === 'reply' ? `Reply to ${contactName}` : 'Internal note'}
          placeholder={
            mode === 'reply'
              ? `Reply to ${contactName}…`
              : 'Note for your team. The customer will not see this.'
          }
          className="block w-full resize-none bg-transparent px-3 py-2 text-[13px] outline-none"
        />
        <div className="flex items-center justify-between gap-2 px-2 pb-2">
          {mode === 'reply' && deliveryNote ? (
            <span className="text-text-muted text-[12px] leading-snug">{deliveryNote}</span>
          ) : (
            <span className="text-text-muted hidden text-[12px] sm:inline">Ctrl+Enter to send</span>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={!draft.trim() || send.isPending}
            className="ml-auto"
          >
            <SendHorizontal aria-hidden />
            {send.isPending ? 'Sending…' : mode === 'reply' ? 'Send' : 'Add note'}
          </Button>
        </div>
      </form>
    </div>
  );
});
