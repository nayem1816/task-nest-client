'use client';

import Link from 'next/link';
import { OrdersTable } from '@/components/commerce/orders-table';
import { ErrorState } from '@/components/page/states';
import { formatRelative } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { useOrderSummary, useOrders } from '@/lib/queries/commerce';

const RECENT = 5;

export function ContactOrders({ contactId }: { contactId: string }) {
  const summary = useOrderSummary(contactId);
  const orders = useOrders({ contactId });
  const recent = orders.data?.pages[0]?.data.slice(0, RECENT) ?? [];

  if (summary.isError)
    return <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />;
  if (!summary.data || summary.data.orderCount === 0) return null;
  const s = summary.data;

  return (
    <section aria-labelledby="orders-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="orders-heading" className="text-base font-semibold">
          Orders
        </h2>
        {s.orderCount > RECENT && (
          <Link
            href={`/orders?contact=${contactId}`}
            className="text-brand text-[13px] hover:underline"
          >
            All {s.orderCount} orders
          </Link>
        )}
      </div>
      <dl className="border-border bg-border grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border text-[13px]">
        {[
          ['Orders', String(s.orderCount)],
          ['Spent', formatMoney(s.totalSpentCents, s.currency)],
          ['Last order', s.lastOrderAt ? formatRelative(s.lastOrderAt) : '—'],
        ].map(([label, value]) => (
          <div key={label} className="bg-surface px-3.5 py-2.5">
            <dt className="text-text-muted text-[12px]">{label}</dt>
            <dd className="tabular mt-0.5 font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      {recent.length > 0 && <OrdersTable orders={recent} showCustomer={false} />}
    </section>
  );
}
