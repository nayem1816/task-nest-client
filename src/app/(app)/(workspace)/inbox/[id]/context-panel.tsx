'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { StageLabel, TagChip } from '@/components/contacts/contact-badges';
import { OrderStatusBadge } from '@/components/commerce/order-status';
import { ChannelIcon, StatusBadge, shortTime } from '@/components/inbox/inbox-badges';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useOrderSummary, useOrders } from '@/lib/queries/commerce';
import { useContact } from '@/lib/queries/contacts';
import { type Conversation, useConversations } from '@/lib/queries/inbox';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

/** Who the customer is, what they bought and what they asked before. */
export function ContextPanel({ conversation }: { conversation: Conversation }) {
  const { can } = useWorkspace();
  const contactId = conversation.contact.id;
  const contact = useContact(contactId);
  const canSeeOrders = can('commerce.read');
  const summary = useOrderSummary(contactId, canSeeOrders);
  const orders = useOrders({ contactId }, canSeeOrders);
  const previous = useConversations({ view: 'all', status: 'all', contactId });

  const c = contact.data;
  const recentOrders = canSeeOrders ? (orders.data?.pages[0]?.data.slice(0, 3) ?? []) : [];
  const earlier = (previous.data?.pages[0]?.data ?? [])
    .filter((x) => x.id !== conversation.id)
    .slice(0, 4);

  return (
    <div className="space-y-6 p-4 text-[13px]">
      <section aria-label="Customer">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{conversation.contact.displayName}</p>
            <p className="text-text-muted mt-0.5">
              <StageLabel stage={conversation.contact.stage} />
            </p>
          </div>
          <Link
            href={`/contacts/${contactId}`}
            className="text-text-muted hover:text-text"
            aria-label="Open contact"
            title="Open contact"
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>
        <dl className="mt-3 space-y-1.5">
          {[
            ['Email', c?.email],
            ['Phone', c?.phone],
            ['Company', c?.company],
            ['Location', c?.location],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="text-text-muted w-16 shrink-0">{label}</dt>
                <dd className="min-w-0 truncate">{value}</dd>
              </div>
            ))}
        </dl>
        {c && c.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {c.tags.map((t) => (
              <TagChip key={t.id} name={t.name} color={t.color} />
            ))}
          </div>
        )}
      </section>

      {canSeeOrders && summary.data && summary.data.orderCount > 0 && (
        <section aria-labelledby="ctx-orders">
          <h3 id="ctx-orders" className="text-text-muted mb-2 text-[12px] font-medium">
            Orders · {summary.data.orderCount} ·{' '}
            {formatMoney(summary.data.totalSpentCents, summary.data.currency)} spent
          </h3>
          <ul className="border-border divide-border divide-y rounded-lg border">
            {recentOrders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="hover:bg-canvas flex items-center gap-2 px-2.5 py-2"
                >
                  <span className="tabular font-medium">#{o.number}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="text-text-muted tabular ml-auto">{formatDate(o.placedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {earlier.length > 0 && (
        <section aria-labelledby="ctx-history">
          <h3 id="ctx-history" className="text-text-muted mb-2 text-[12px] font-medium">
            Earlier conversations
          </h3>
          <ul className="space-y-1">
            {earlier.map((x) => (
              <li key={x.id}>
                <Link
                  href={`/inbox/${x.id}`}
                  className="hover:bg-canvas -mx-1.5 block rounded-md px-1.5 py-1.5"
                >
                  <span className="flex items-center gap-1.5">
                    <ChannelIcon type={x.channel.type} className="text-text-muted" />
                    <StatusBadge status={x.status} />
                    <span className="text-text-muted tabular ml-auto text-[12px]">
                      {shortTime(x.lastMessageAt)}
                    </span>
                  </span>
                  <span className="text-text-muted mt-0.5 line-clamp-2 text-[12px]">
                    {x.subject ?? x.lastMessagePreview}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
