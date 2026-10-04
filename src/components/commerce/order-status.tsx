import type { OrderStatus } from '@/lib/queries/commerce';
import { cn } from '@/lib/utils';

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'FULFILLED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending payment',
  PAID: 'Paid',
  FULFILLED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

const STYLES: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-800',
  PAID: 'bg-blue-50 text-blue-700',
  FULFILLED: 'bg-blue-50 text-blue-700',
  SHIPPED: 'bg-violet-50 text-violet-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-slate-100 text-slate-600',
  REFUNDED: 'bg-red-50 text-red-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-md px-1.5 text-[12px] font-medium whitespace-nowrap',
        STYLES[status],
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
