'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, ChevronDown, PanelRight, RotateCcw, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  ChannelIcon,
  HandlerBadge,
  PRIORITY_LABELS,
  StatusBadge,
} from '@/components/inbox/inbox-badges';
import { ErrorState } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, unwrap } from '@/lib/api/errors';
import {
  type Conversation,
  type ConversationPriority,
  type ConversationStatus,
  useConversation,
} from '@/lib/queries/inbox';
import { useMembers, useWorkspaceKey } from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { Composer } from './composer';
import { ContextPanel } from './context-panel';
import { MessageThread } from './message-thread';

const DELIVERY_NOTES: Partial<Record<Conversation['channel']['type'], string>> = {
  EMAIL: 'Saved here. Email sending is not connected yet.',
};

export function ConversationView({ id }: { id: string }) {
  const conversation = useConversation(id);
  const { can } = useWorkspace();
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [contextOpen, setContextOpen] = useState(false);

  // Opening a conversation marks it read for you.
  const markRead = useMutation({
    mutationFn: async () =>
      unwrap(await api.POST('/api/v1/conversations/{id}/read', { params: { path: { id } } })),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key('inbox', 'list') });
    },
  });
  const unread = conversation.data?.unreadCount ?? 0;
  const { mutate: read } = markRead;
  useEffect(() => {
    if (unread > 0) read();
  }, [id, unread, read]);

  const update = useMutation({
    mutationFn: async (body: { status?: ConversationStatus; priority?: ConversationPriority }) =>
      unwrap(await api.PATCH('/api/v1/conversations/{id}', { params: { path: { id } }, body })),
    onSuccess: (updated) => refresh(updated),
    onError: (error) => toast.error(errorMessage(error)),
  });

  const assign = useMutation({
    mutationFn: async (assigneeId: string | null) =>
      unwrap(
        await api.POST('/api/v1/conversations/{id}/assign', {
          params: { path: { id } },
          body: { assigneeId },
        }),
      ),
    onSuccess: (updated) => refresh(updated),
    onError: (error) => toast.error(errorMessage(error)),
  });

  function refresh(updated: Conversation) {
    queryClient.setQueryData(key('inbox', 'conversation', id), updated);
    void queryClient.invalidateQueries({ queryKey: key('inbox', 'messages', id) });
    void queryClient.invalidateQueries({ queryKey: key('inbox', 'list') });
    void queryClient.invalidateQueries({ queryKey: key('inbox', 'counts') });
  }

  const c = conversation.data;
  const canManage = can('conversation.manage');
  const resolved = c?.status === 'RESOLVED' || c?.status === 'CLOSED';

  // R focuses the reply box, S resolves or reopens. Ignored while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || !c) return;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'r') {
        e.preventDefault();
        composerRef.current?.focus();
      } else if (e.key === 's' && canManage && !update.isPending) {
        e.preventDefault();
        update.mutate({ status: resolved ? 'OPEN' : 'RESOLVED' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [c, canManage, resolved, update]);

  if (conversation.isPending) {
    return <div className="bg-canvas flex-1" aria-busy />;
  }
  if (conversation.isError || !c) {
    const missing = conversation.error instanceof ApiError && conversation.error.status === 404;
    return (
      <div className="flex-1 p-6">
        {missing ? (
          <p className="text-text-muted">This conversation doesn&apos;t exist in this workspace.</p>
        ) : (
          <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1">
      <section className="flex min-w-0 flex-1 flex-col" aria-label="Conversation">
        <header className="border-border bg-surface flex items-center gap-2 border-b px-3 py-2.5 sm:px-4">
          <Link
            href="/inbox"
            className="text-text-muted hover:text-text -ml-1 rounded-md p-1 md:hidden"
            aria-label="Back to inbox"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold">{c.contact.displayName}</h2>
            <p className="text-text-muted flex min-w-0 items-center gap-x-2 text-[12px]">
              <span className="inline-flex shrink-0 items-center gap-1">
                <ChannelIcon type={c.channel.type} />
                {c.channel.name}
              </span>
              {c.subject && <span className="truncate">· {c.subject}</span>}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <span className="hidden items-center gap-1.5 lg:flex">
              <HandlerBadge handler={c.handler} />
              <StatusBadge status={c.status} />
            </span>
            {can('conversation.assign') && (
              <AssignMenu conversation={c} onAssign={(memberId) => assign.mutate(memberId)} />
            )}
            {canManage && (
              <>
                <PriorityMenu
                  priority={c.priority}
                  onChange={(priority) => update.mutate({ priority })}
                />
                <Button
                  size="sm"
                  variant={resolved ? 'outline' : 'default'}
                  disabled={update.isPending}
                  onClick={() => update.mutate({ status: resolved ? 'OPEN' : 'RESOLVED' })}
                  title={resolved ? 'Reopen (S)' : 'Resolve (S)'}
                >
                  {resolved ? <RotateCcw aria-hidden /> : <Check aria-hidden />}
                  <span className="hidden sm:inline">{resolved ? 'Reopen' : 'Resolve'}</span>
                </Button>
              </>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              className="xl:hidden"
              onClick={() => setContextOpen(true)}
              aria-label="Customer details"
            >
              <PanelRight aria-hidden />
            </Button>
          </div>
        </header>

        {c.handler === 'AI_ESCALATED' && c.escalationReason && (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-900">
            <span className="font-medium">Escalated by the AI:</span> {c.escalationReason}
          </p>
        )}

        <MessageThread conversationId={c.id} contactName={c.contact.displayName} />
        <Composer
          ref={composerRef}
          conversationId={c.id}
          contactName={c.contact.displayName.split(' ')[0] ?? c.contact.displayName}
          canReply={can('conversation.reply')}
          deliveryNote={DELIVERY_NOTES[c.channel.type]}
        />
      </section>

      <aside
        className="border-border bg-surface hidden w-[300px] shrink-0 overflow-y-auto border-l xl:block"
        aria-label="Customer details"
      >
        <ContextPanel conversation={c} />
      </aside>
      <Sheet open={contextOpen} onOpenChange={setContextOpen}>
        <SheetContent side="right" className="w-[320px] overflow-y-auto p-0">
          <SheetTitle className="sr-only">Customer details</SheetTitle>
          <ContextPanel conversation={c} />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AssignMenu({
  conversation,
  onAssign,
}: {
  conversation: Conversation;
  onAssign(memberId: string | null): void;
}) {
  const { current } = useWorkspace();
  const members = useMembers();
  const active = (members.data ?? []).filter((m) => m.status === 'ACTIVE');
  const label = conversation.assignee?.name ?? 'Unassigned';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="max-w-[160px]"
          aria-label={`Assignee: ${label}`}
        >
          <UserRound aria-hidden />
          <span className="hidden truncate sm:inline">{label}</span>
          <ChevronDown className="text-text-muted" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {current && conversation.assignee?.id !== current.memberId && (
          <>
            <DropdownMenuItem onSelect={() => onAssign(current.memberId)}>
              Assign to me
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel className="text-text-muted text-[12px] font-normal">
          Team members
        </DropdownMenuLabel>
        {active.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onSelect={() => onAssign(m.id)}
            disabled={m.id === conversation.assignee?.id}
          >
            <span className="truncate">{m.displayName ?? m.user.name}</span>
            <span className="text-text-muted ml-auto text-[12px]">{m.role.name}</span>
          </DropdownMenuItem>
        ))}
        {conversation.assignee && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAssign(null)}>Unassign</DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityMenu({
  priority,
  onChange,
}: {
  priority: ConversationPriority;
  onChange(priority: ConversationPriority): void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="hidden sm:inline-flex"
          aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}
        >
          {PRIORITY_LABELS[priority]}
          <ChevronDown className="text-text-muted" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="text-text-muted text-[12px] font-normal">
          Priority
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={priority}
          onValueChange={(v) => onChange(v as ConversationPriority)}
        >
          {(['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const).map((p) => (
            <DropdownMenuRadioItem key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
