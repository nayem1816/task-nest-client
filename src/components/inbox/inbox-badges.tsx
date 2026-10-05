import { Globe, Mail, MessageCircle, Phone, Send, Sparkles } from 'lucide-react';
import type { Conversation, ConversationPriority, ConversationStatus } from '@/lib/queries/inbox';
import { cn } from '@/lib/utils';

const CHANNEL_ICONS = {
  WEBSITE_CHAT: Globe,
  EMAIL: Mail,
  PHONE: Phone,
  TELEGRAM: Send,
  WHATSAPP: MessageCircle,
  MESSENGER: MessageCircle,
  INSTAGRAM: MessageCircle,
} as const;

export function ChannelIcon({
  type,
  className,
}: {
  type: Conversation['channel']['type'];
  className?: string;
}) {
  const Icon = CHANNEL_ICONS[type] ?? MessageCircle;
  return <Icon className={cn('size-3.5', className)} aria-hidden />;
}

export const STATUS_LABELS: Record<ConversationStatus, string> = {
  OPEN: 'Open',
  PENDING: 'Waiting on customer',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

const STATUS_STYLES: Record<ConversationStatus, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  PENDING: 'bg-amber-50 text-amber-800',
  RESOLVED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-600',
};

export function StatusBadge({ status }: { status: ConversationStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-md px-1.5 text-[12px] font-medium whitespace-nowrap',
        STATUS_STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Only shown when the AI is involved; human handling is the unremarkable default. */
export function HandlerBadge({ handler }: { handler: Conversation['handler'] }) {
  if (handler === 'HUMAN_HANDLING') return null;
  const escalated = handler === 'AI_ESCALATED';
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-md px-1.5 text-[12px] font-medium whitespace-nowrap',
        escalated ? 'bg-amber-50 text-amber-800' : 'bg-ai-soft text-ai',
      )}
    >
      <Sparkles className="size-3" aria-hidden />
      {escalated ? 'Escalated by AI' : 'AI is answering'}
    </span>
  );
}

export const PRIORITY_LABELS: Record<ConversationPriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
};

/** A small marker for high and urgent; normal and low show nothing. */
export function PriorityMark({ priority }: { priority: ConversationPriority }) {
  if (priority !== 'HIGH' && priority !== 'URGENT') return null;
  return (
    <span
      title={`${PRIORITY_LABELS[priority]} priority`}
      className={cn(
        'text-[11px] font-semibold uppercase',
        priority === 'URGENT' ? 'text-danger' : 'text-warning',
      )}
    >
      {priority === 'URGENT' ? 'Urgent' : 'High'}
    </span>
  );
}

/** "2m", "3h", "Yesterday", "Sep 28": compact enough for a list row. */
export function shortTime(iso: string, now = Date.now()): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  if (hours < 48) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso));
}
