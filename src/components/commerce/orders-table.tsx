import Link from 'next/link';
import { formatDate } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import type { OrderSummary } from '@/lib/queries/commerce';
import { OrderStatusBadge } from './order-status';

/** Used on the orders page and, without the customer column, on a contact's page. */
export function OrdersTable({
  orders,
  showCustomer = true,
}: {
  orders: OrderSummary[];
  showCustomer?: boolean;
}) {
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-[10px] border">
      <table className="w-full text-left text-[13px]">
        <thead className="text-text-muted border-border border-b text-[12px]">
          <tr>
            <th className="px-4 py-2.5 font-medium">Order</th>
            {showCustomer && <th className="px-4 py-2.5 font-medium">Customer</th>}
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 text-right font-medium">Total</th>
            <th className="px-4 py-2.5 text-right font-medium">Placed</th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-canvas">
              <td className="px-4 py-2 whitespace-nowrap">
                <Link href={`/orders/${o.id}`} className="tabular font-medium hover:underline">
                  #{o.number}
                </Link>
                <span className="text-text-muted ml-2">
                  {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
                </span>
              </td>
              {showCustomer && (
                <td className="max-w-[240px] truncate px-4 py-2">
                  {o.contact ? (
                    <Link href={`/contacts/${o.contact.id}`} className="hover:underline">
                      {o.contact.displayName}
                    </Link>
                  ) : (
                    <span className="text-text-muted">Guest</span>
                  )}
                </td>
              )}
              <td className="px-4 py-2">
                <OrderStatusBadge status={o.status} />
              </td>
              <td className="tabular px-4 py-2 text-right">
                {formatMoney(o.totalCents, o.currency)}
              </td>
              <td className="text-text-muted tabular px-4 py-2 text-right whitespace-nowrap">
                {formatDate(o.placedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
