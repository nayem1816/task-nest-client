'use client';

import { Lock, Sparkles } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef } from 'react';
import { ErrorState } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/format';
import { type Message, useMessages } from '@/lib/queries/inbox';
import { cn } from '@/lib/utils';

export function MessageThread({
  conversationId,
  contactName,
}: {
  conversationId: string;
  contactName: string;
}) {
  const messages = useMessages(conversationId);
  const scroller = useRef<HTMLDivElement>(null);
  const pinnedToBottom = useRef(true);

  // Pages arrive newest first; render oldest at the top.
  const list = [...(messages.data?.pages ?? [])].reverse().flatMap((p) => p.data);
  const lastId = list.at(-1)?.id;

  // Follow new messages only if the reader is already at the bottom, so
  // scrolling back through history is not interrupted.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && pinnedToBottom.current) el.scrollTop = el.scrollHeight;
  }, [lastId]);

  useEffect(() => {
    pinnedToBottom.current = true;
  }, [conversationId]);

  return (
    <div
      ref={scroller}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinnedToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className="bg-canvas min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6"
      aria-live="polite"
      aria-busy={messages.isFetching}
    >
      {messages.hasNextPage && (
        <div className="mb-4 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              pinnedToBottom.current = false;
              void messages.fetchNextPage();
            }}
            disabled={messages.isFetchingNextPage}
          >
            {messages.isFetchingNextPage ? 'Loading…' : 'Show earlier messages'}
          </Button>
        </div>
      )}
      {messages.isError && (
        <ErrorState error={messages.error} onRetry={() => void messages.refetch()} />
      )}
      {messages.isPending && <ThreadPlaceholder />}

      <ol className="mx-auto max-w-3xl space-y-3">
        {list.map((m, i) => {
          const previous = list[i - 1];
          const newDay = !previous || dayKey(previous.createdAt) !== dayKey(m.createdAt);
          return (
            <Fragment key={m.id}>
              {newDay && (
                <li className="text-text-muted pt-2 pb-1 text-center text-[12px] font-medium">
                  {dayLabel(m.createdAt)}
                </li>
              )}
              <MessageItem
                message={m}
                contactName={contactName}
                // Group consecutive messages from the same sender under one label.
                showLabel={newDay || !sameSender(previous, m)}
              />
            </Fragment>
          );
        })}
      </ol>
    </div>
  );
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** "Today", "Yesterday", or "Monday, Sep 28". */
export function dayLabel(iso: string, now = new Date()): string {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { weekday: 'long', month: 'short', day: 'numeric' }).format(
    new Date(iso),
  );
}

function sameSender(a: Message | undefined, b: Message): boolean {
  if (!a || a.sender === 'SYSTEM' || b.sender === 'SYSTEM') return false;
  return a.sender === b.sender && a.author?.id === b.author?.id && a.internal === b.internal;
}

function MessageItem({
  message: m,
  contactName,
  showLabel,
}: {
  message: Message;
  contactName: string;
  showLabel: boolean;
}) {
  const time = (
    <time dateTime={m.createdAt} className="tabular">
      {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
        new Date(m.createdAt),
      )}
    </time>
  );

  if (m.sender === 'SYSTEM') {
    return (
      <li className="text-text-muted flex items-center gap-3 py-1 text-[12px]">
        <span className="bg-border h-px flex-1" aria-hidden />
        <span title={formatDateTime(m.createdAt)}>
          {m.body} · {time}
        </span>
        <span className="bg-border h-px flex-1" aria-hidden />
      </li>
    );
  }

  const fromCustomer = m.sender === 'CONTACT';
  const fromAi = m.sender === 'AI';
  const who = fromCustomer
    ? contactName
    : fromAi
      ? 'AI agent'
      : (m.author?.name ?? 'Former member');

  return (
    <li className={cn('flex flex-col', fromCustomer ? 'items-start' : 'items-end')}>
      {showLabel && (
        <span className="text-text-muted mb-1 flex items-center gap-1 px-1 text-[12px]">
          {m.internal && <Lock className="size-3" aria-hidden />}
          {fromAi && <Sparkles className="text-ai size-3" aria-hidden />}
          <span className="font-medium">{who}</span>
          {m.internal && <span>· internal note</span>}
          <span title={formatDateTime(m.createdAt)}>· {time}</span>
        </span>
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-[10px] border px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap sm:max-w-[75%]',
          fromCustomer && 'border-border bg-surface',
          !fromCustomer && !m.internal && !fromAi && 'bg-brand-soft border-blue-100',
          fromAi && 'bg-ai-soft border-violet-100',
          m.internal && 'border-amber-200 bg-amber-50',
        )}
      >
        {m.body}
      </div>
    </li>
  );
}

function ThreadPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-hidden>
      <div className="bg-muted h-12 w-2/3 animate-pulse rounded-[10px]" />
      <div className="bg-muted ml-auto h-16 w-1/2 animate-pulse rounded-[10px]" />
      <div className="bg-muted h-10 w-1/3 animate-pulse rounded-[10px]" />
    </div>
  );
}
