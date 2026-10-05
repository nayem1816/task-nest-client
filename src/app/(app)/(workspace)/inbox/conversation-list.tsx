'use client';

import { Inbox, ListFilter, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChannelIcon, PriorityMark, shortTime } from '@/components/inbox/inbox-badges';
import { initials } from '@/components/shell/initials';
import { ErrorState } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import {
  type Conversation,
  type InboxFilters,
  type InboxView,
  useConversations,
  useInboxCounts,
} from '@/lib/queries/inbox';
import { useRealtime } from '@/lib/realtime/realtime-provider';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';

const VIEWS: { id: InboxView; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'mine', label: 'Mine' },
  { id: 'unassigned', label: 'Unassigned' },
  { id: 'team', label: 'My teams' },
];

interface ConversationListProps {
  filters: InboxFilters;
  onFiltersChange(filters: InboxFilters): void;
}

export function ConversationList({ filters, onFiltersChange }: ConversationListProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const search = useDebouncedValue(searchInput.trim());
  const effective = { ...filters, search };
  const conversations = useConversations(effective);
  const counts = useInboxCounts();
  const pathname = usePathname();

  const set = (patch: Partial<InboxFilters>) => onFiltersChange({ ...filters, ...patch });
  const rows = conversations.data?.pages.flatMap((p) => p.data) ?? [];
  const extraFilters = [filters.unread, filters.priority, filters.handler].filter(Boolean).length;

  return (
    <>
      <div className="border-border space-y-2.5 border-b px-3 pt-3 pb-2.5">
        <div className="flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-base font-semibold">Inbox</h1>
            <ConnectionNote />
          </div>
          <NativeSelect
            aria-label="Status"
            value={filters.status}
            onChange={(e) => set({ status: e.target.value as InboxFilters['status'] })}
            className="h-7 w-[136px] text-[12px]"
          >
            <option value="open">Open</option>
            <option value="PENDING">Waiting on customer</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
            <option value="all">All statuses</option>
          </NativeSelect>
        </div>

        <div role="tablist" aria-label="Inbox view" className="bg-muted flex rounded-lg p-0.5">
          {VIEWS.map((v) => {
            const active = filters.view === v.id;
            const count = counts.data?.[v.id];
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => set({ view: v.id })}
                className={cn(
                  'flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-[12px] whitespace-nowrap',
                  active
                    ? 'bg-surface text-text font-medium shadow-xs'
                    : 'text-text-muted hover:text-text',
                )}
              >
                {v.label}
                {count !== undefined && <span className="tabular text-text-muted">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="text-text-muted pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2"
            />
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, email or message"
              aria-label="Search conversations"
              className="h-7 pl-7 text-[12px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-[12px]"
                aria-label="More filters"
              >
                <ListFilter aria-hidden />
                {extraFilters > 0 && <span className="tabular">{extraFilters}</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="text-text-muted text-[12px] font-normal">
                Show only
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={Boolean(filters.unread)}
                onCheckedChange={(v) => set({ unread: v || undefined })}
              >
                Unread
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.priority === 'high'}
                onCheckedChange={(v) => set({ priority: v ? 'high' : undefined })}
              >
                High and urgent
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.handler === 'AI_HANDLING'}
                onCheckedChange={(v) => set({ handler: v ? 'AI_HANDLING' : undefined })}
              >
                AI is answering
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.handler === 'AI_ESCALATED'}
                onCheckedChange={(v) => set({ handler: v ? 'AI_ESCALATED' : undefined })}
              >
                Escalated by AI
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.handler === 'HUMAN_HANDLING'}
                onCheckedChange={(v) => set({ handler: v ? 'HUMAN_HANDLING' : undefined })}
              >
                Handled by people
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" aria-busy={conversations.isFetching}>
        {conversations.isPending && <ListPlaceholder />}
        {conversations.isError && (
          <div className="p-3">
            <ErrorState error={conversations.error} onRetry={() => void conversations.refetch()} />
          </div>
        )}
        {conversations.isSuccess && rows.length === 0 && (
          <EmptyList filtered={Boolean(search) || extraFilters > 0} view={filters.view} />
        )}
        <ul>
          {rows.map((c) => (
            <ConversationRow key={c.id} conversation={c} active={pathname === `/inbox/${c.id}`} />
          ))}
        </ul>
        {conversations.hasNextPage && (
          <div className="p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => void conversations.fetchNextPage()}
              disabled={conversations.isFetchingNextPage}
            >
              {conversations.isFetchingNextPage ? 'Loading…' : 'Load older conversations'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function ConversationRow({
  conversation: c,
  active,
}: {
  conversation: Conversation;
  active: boolean;
}) {
  const unread = c.unreadCount > 0;
  return (
    <li>
      <Link
        href={`/inbox/${c.id}`}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'border-border focus-visible:ring-ring/50 flex gap-2.5 border-b px-3 py-2.5 outline-none focus-visible:ring-3 focus-visible:ring-inset',
          active ? 'bg-brand-soft' : 'hover:bg-canvas',
        )}
      >
        <span
          aria-hidden
          className="bg-muted mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
        >
          {initials(c.contact.displayName)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className={cn('truncate text-[13px]', unread ? 'font-semibold' : 'font-medium')}>
              {c.contact.displayName}
            </span>
            <span className="text-text-muted" title={c.channel.name}>
              <ChannelIcon type={c.channel.type} />
            </span>
            <span className="text-text-muted tabular ml-auto shrink-0 text-[12px]">
              {shortTime(c.lastMessageAt)}
            </span>
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span
              className={cn(
                'line-clamp-2 flex-1 text-[12px] leading-snug',
                unread ? 'text-text' : 'text-text-muted',
              )}
            >
              {c.lastMessagePreview ?? 'No messages yet'}
            </span>
            {unread && (
              <span
                className="bg-brand tabular flex h-[18px] min-w-[18px] shrink-0 items-center justify-center self-start rounded-full px-1 text-[11px] font-semibold text-white"
                aria-label={`${c.unreadCount} unread`}
              >
                {c.unreadCount}
              </span>
            )}
          </span>
          <span className="text-text-muted mt-1 flex items-center gap-2 text-[11px]">
            <PriorityMark priority={c.priority} />
            {c.handler !== 'HUMAN_HANDLING' && (
              <span className="text-ai">{c.handler === 'AI_ESCALATED' ? 'Escalated' : 'AI'}</span>
            )}
            <span className="truncate">{c.assignee ? c.assignee.name : 'Unassigned'}</span>
            {c.tags.slice(0, 2).map((t) => (
              <span key={t.id} className="truncate">
                #{t.name}
              </span>
            ))}
          </span>
        </span>
      </Link>
    </li>
  );
}

function EmptyList({ filtered, view }: { filtered: boolean; view: InboxView }) {
  const Icon = filtered ? SearchX : Inbox;
  const text = filtered
    ? 'Nothing matches these filters.'
    : view === 'mine'
      ? 'Nothing assigned to you. Pick something up from Unassigned.'
      : view === 'unassigned'
        ? 'Every open conversation has an owner.'
        : 'No open conversations. New messages land here.';
  return (
    <div className="text-text-muted flex flex-col items-center gap-2 px-6 py-12 text-center text-[13px]">
      <Icon className="size-5" aria-hidden />
      {text}
    </div>
  );
}

function ListPlaceholder() {
  return (
    <div aria-hidden>
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="border-border flex gap-2.5 border-b px-3 py-3">
          <div className="bg-muted size-8 animate-pulse rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="bg-muted h-3 w-2/5 animate-pulse rounded" />
            <div className="bg-muted h-2.5 w-4/5 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Silent while live; says so when updates are delayed, since the list may be stale. */
function ConnectionNote() {
  const status = useRealtime()?.status;
  if (status === 'reconnecting') {
    return (
      <span className="text-text-muted flex items-center gap-1.5 text-[12px]" role="status">
        <span className="size-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
        Reconnecting…
      </span>
    );
  }
  if (status === 'paused') {
    return (
      <span
        className="text-text-muted text-[12px]"
        role="status"
        title="New messages show up within 15 seconds instead of instantly."
      >
        Live updates off
      </span>
    );
  }
  return null;
}
