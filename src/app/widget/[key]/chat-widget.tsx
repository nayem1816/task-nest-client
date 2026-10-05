'use client';

import { ChevronDown, MessageCircle, RotateCw, SendHorizontal, Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { textOn } from '@/lib/color';
import { useWidget, type WidgetConfig, type WidgetMessage, type WidgetVisitor } from './use-widget';

const time = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' });

function post(message: Record<string, unknown>) {
  window.parent.postMessage({ source: 'tasknest-widget', ...message }, '*');
}

const seenKey = (publicKey: string) => `tasknest.widget.${publicKey}.seen`;

function readSeen(publicKey: string): string {
  try {
    return localStorage.getItem(seenKey(publicKey)) ?? '';
  } catch {
    return '';
  }
}

export function ChatWidget({
  publicKey,
  pageOrigin,
}: {
  publicKey: string;
  pageOrigin: string | null;
}) {
  const { phase, messages, send, retry } = useWidget(publicKey, pageOrigin);
  const [open, setOpen] = useState(false);
  // Newest reply the visitor has had on screen. Ids are time-ordered (UUIDv7).
  const [seen, setSeen] = useState(() => readSeen(publicKey));

  const replies = messages.filter((m) => m.from !== 'visitor' && !m.pending);
  const latestReply = replies.at(-1)?.id ?? '';
  const unread = open ? 0 : replies.filter((m) => m.id > seen).length;

  const markSeen = () => {
    setSeen(latestReply);
    try {
      localStorage.setItem(seenKey(publicKey), latestReply);
    } catch {
      // Unread counts reset on reload without storage; nothing else depends on it.
    }
  };

  const toggle = () => {
    markSeen();
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (phase.name === 'unavailable') post({ type: 'unavailable', message: phase.message });
    if (phase.name === 'ready') post({ type: 'state', state: open ? 'open' : 'closed' });
  }, [phase, open]);

  if (phase.name !== 'ready') return null;
  const { config } = phase;
  const accentText = textOn(config.accentColor);

  return (
    <div
      className="text-[14px] text-slate-900"
      style={{ '--accent': config.accentColor, '--accent-text': accentText } as React.CSSProperties}
    >
      {open && (
        <ChatPanel
          config={config}
          visitor={phase.visitor}
          messages={messages}
          onSend={send}
          onRetry={retry}
          onClose={toggle}
        />
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={open ? 'Close chat' : unread ? `Open chat, ${unread} new` : 'Open chat'}
        aria-expanded={open}
        className={cn(
          'fixed right-4 bottom-4 flex size-14 items-center justify-center rounded-full bg-(--accent) text-(--accent-text) shadow-[0_6px_20px_rgba(15,23,42,0.22)] transition-transform hover:scale-[1.04] focus-visible:ring-4 focus-visible:ring-(--accent)/30 focus-visible:outline-none active:scale-95',
          open && 'max-[439px]:hidden',
        )}
      >
        {open ? (
          <ChevronDown className="size-6" aria-hidden />
        ) : (
          <MessageCircle className="size-6" aria-hidden />
        )}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}

function ChatPanel({
  config,
  visitor,
  messages,
  onSend,
  onRetry,
  onClose,
}: {
  config: WidgetConfig;
  visitor: WidgetVisitor;
  messages: WidgetMessage[];
  onSend: (body: string, about?: { name?: string; email?: string }) => Promise<boolean>;
  onRetry: (message: WidgetMessage) => Promise<boolean>;
  onClose: () => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [lastId]);

  const needsDetails = config.askForEmail && !visitor.email && messages.length === 0;

  return (
    <section
      aria-label={`Chat with ${config.workspaceName}`}
      className="fixed top-4 right-4 bottom-[84px] flex w-[388px] flex-col overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)] max-[439px]:inset-0 max-[439px]:w-auto max-[439px]:rounded-none max-[439px]:border-0"
    >
      <header className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-(--accent) text-[14px] font-semibold text-(--accent-text)"
        >
          {config.workspaceName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{config.workspaceName}</h1>
          <p className="truncate text-[12px] text-slate-500">Messages go straight to the team</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        >
          <X className="size-4" aria-hidden />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto bg-slate-50 px-4 py-4" aria-live="polite">
        {config.greeting && (
          <Bubble side="left" label={config.workspaceName}>
            {config.greeting}
          </Bubble>
        )}
        {messages.map((m, i) => {
          const previous = messages[i - 1];
          const showLabel =
            m.from !== 'visitor' &&
            (previous?.from !== m.from || previous?.authorName !== m.authorName);
          return (
            <Bubble
              key={m.id}
              side={m.from === 'visitor' ? 'right' : 'left'}
              label={
                showLabel
                  ? m.from === 'assistant'
                    ? 'Assistant'
                    : (m.authorName ?? config.workspaceName)
                  : undefined
              }
              assistant={m.from === 'assistant'}
              footer={
                m.failed ? (
                  <button
                    type="button"
                    onClick={() => void onRetry(m)}
                    className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline"
                  >
                    <RotateCw className="size-3" aria-hidden />
                    Not sent. Try again
                  </button>
                ) : m.pending ? (
                  'Sending…'
                ) : (
                  time.format(new Date(m.createdAt))
                )
              }
            >
              {m.body}
            </Bubble>
          );
        })}
        <div ref={bottom} />
      </div>

      <Composer needsDetails={needsDetails} visitor={visitor} onSend={onSend} />
      <p className="border-t border-slate-100 py-1.5 text-center text-[11px] text-slate-400">
        Chat by TaskNest
      </p>
    </section>
  );
}

function Bubble({
  side,
  label,
  assistant,
  footer,
  children,
}: {
  side: 'left' | 'right';
  label?: string;
  assistant?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('mb-2 flex flex-col', side === 'right' ? 'items-end' : 'items-start')}>
      {label && (
        <span className="mb-1 flex items-center gap-1 px-1 text-[12px] font-medium text-slate-500">
          {assistant && <Sparkles className="size-3" aria-hidden />}
          {label}
        </span>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-[14px] px-3 py-2 leading-relaxed break-words whitespace-pre-wrap',
          side === 'right'
            ? 'rounded-br-[4px] bg-(--accent) text-(--accent-text)'
            : 'rounded-bl-[4px] border border-slate-200 bg-white',
        )}
      >
        {children}
      </div>
      {footer && <span className="mt-0.5 px-1 text-[11px] text-slate-400">{footer}</span>}
    </div>
  );
}

function Composer({
  needsDetails,
  visitor,
  onSend,
}: {
  needsDetails: boolean;
  visitor: WidgetVisitor;
  onSend: (body: string, about?: { name?: string; email?: string }) => Promise<boolean>;
}) {
  const [body, setBody] = useState('');
  const [name, setName] = useState(visitor.name ?? '');
  const [email, setEmail] = useState('');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSend = body.trim() !== '' && (!needsDetails || emailValid);

  const submit = () => {
    if (!canSend) return;
    const text = body.trim();
    setBody('');
    void onSend(
      text,
      needsDetails ? { name: name.trim() || undefined, email: email.trim() } : undefined,
    );
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-t border-slate-200 bg-white p-3"
    >
      {needsDetails && (
        <fieldset className="mb-2 space-y-1.5">
          <legend className="mb-1.5 text-[12px] text-slate-500">
            So the team knows who they are talking to:
          </legend>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            aria-label="Your name"
            autoComplete="name"
            maxLength={80}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-(--accent) focus:ring-3 focus:ring-(--accent)/20"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 outline-none focus:border-(--accent) focus:ring-3 focus:ring-(--accent)/20"
          />
        </fieldset>
      )}
      <div className="flex items-end gap-2 rounded-xl border border-slate-200 py-1.5 pr-1.5 pl-3 focus-within:border-(--accent) focus-within:ring-3 focus-within:ring-(--accent)/20">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          maxLength={5000}
          placeholder="Write a message…"
          aria-label="Message"
          className="[field-sizing:content] max-h-28 min-h-[30px] flex-1 resize-none bg-transparent py-1 leading-snug outline-none"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-(--accent) text-(--accent-text) transition-opacity disabled:opacity-40"
        >
          <SendHorizontal className="size-4" aria-hidden />
        </button>
      </div>
    </form>
  );
}
