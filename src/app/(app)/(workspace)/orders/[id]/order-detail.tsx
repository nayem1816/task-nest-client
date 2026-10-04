'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
} from '@/components/commerce/order-status';
import { FormField } from '@/components/forms/form-field';
import { ErrorState } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { ApiError, errorMessage, unwrap } from '@/lib/api/errors';
import { formatDate, formatDateTime } from '@/lib/format';
import { formatMoney } from '@/lib/money';
import { type Order, type OrderStatus, useOrder } from '@/lib/queries/commerce';
import { useWorkspaceKey } from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

export function OrderDetailView({ id }: { id: string }) {
  const order = useOrder(id);
  const { can } = useWorkspace();

  if (order.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6 lg:px-8" aria-hidden>
        <div className="bg-muted h-6 w-40 animate-pulse rounded" />
        <div className="bg-muted h-56 animate-pulse rounded-[10px]" />
      </div>
    );
  }
  if (order.isError) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <BackLink />
        <div className="mt-6">
          {order.error instanceof ApiError && order.error.status === 404 ? (
            <p className="text-text-muted">This order doesn&apos;t exist in this workspace.</p>
          ) : (
            <ErrorState error={order.error} onRetry={() => void order.refetch()} />
          )}
        </div>
      </div>
    );
  }

  const o = order.data;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <BackLink />
      <header className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="tabular text-[22px] font-semibold tracking-tight">Order #{o.number}</h1>
        <OrderStatusBadge status={o.status} />
      </header>
      <p className="text-text-muted mt-1 text-[13px]">
        Placed {formatDateTime(o.placedAt)}
        {o.contact && (
          <>
            {' '}
            by{' '}
            <Link href={`/contacts/${o.contact.id}`} className="text-text hover:underline">
              {o.contact.displayName}
            </Link>
          </>
        )}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section
          aria-label="Items"
          className="border-border bg-surface self-start rounded-[10px] border"
        >
          <table className="w-full text-left text-[13px]">
            <thead className="text-text-muted border-border border-b text-[12px]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 text-right font-medium">Qty</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {o.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    {item.name}
                    {item.sku && (
                      <span className="text-text-muted ml-2 font-mono text-[12px]">{item.sku}</span>
                    )}
                  </td>
                  <td className="tabular px-4 py-2 text-right">{item.quantity}</td>
                  <td className="tabular px-4 py-2 text-right">
                    {formatMoney(item.unitPriceCents, o.currency)}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {formatMoney(item.totalCents, o.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="tabular text-right">
              <tr className="border-border border-t">
                <td colSpan={3} className="text-text-muted px-4 pt-2.5">
                  Subtotal
                </td>
                <td className="px-4 pt-2.5">{formatMoney(o.subtotalCents, o.currency)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="text-text-muted px-4 py-1">
                  Shipping
                </td>
                <td className="px-4 py-1">
                  {o.shippingCents ? formatMoney(o.shippingCents, o.currency) : 'Free'}
                </td>
              </tr>
              <tr className="font-semibold">
                <td colSpan={3} className="px-4 pb-3">
                  Total
                </td>
                <td className="px-4 pb-3">{formatMoney(o.totalCents, o.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <aside className="space-y-4">
          <Shipping order={o} editable={can('commerce.manage')} />
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/orders"
      className="text-text-muted hover:text-text inline-flex items-center gap-1 text-[13px]"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Orders
    </Link>
  );
}

const shippingSchema = z.object({
  status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
  carrier: z.string().trim().max(40),
  trackingNumber: z.string().trim().max(60),
  estimatedDelivery: z.string(),
});
type ShippingValues = z.infer<typeof shippingSchema>;

function Shipping({ order, editable }: { order: Order; editable: boolean }) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const form = useForm<ShippingValues>({
    resolver: zodResolver(shippingSchema),
    values: {
      status: order.status,
      carrier: order.carrier ?? '',
      trackingNumber: order.trackingNumber ?? '',
      estimatedDelivery: order.estimatedDelivery ?? '',
    },
  });

  const save = useMutation({
    mutationFn: async (body: ShippingValues) =>
      unwrap(await api.PATCH('/api/v1/orders/{id}', { params: { path: { id: order.id } }, body })),
    onSuccess: async (saved) => {
      queryClient.setQueryData(key('orders', 'detail', order.id), saved);
      await queryClient.invalidateQueries({ queryKey: key('orders', 'list') });
      toast.success(`Order #${saved.number} updated.`);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  if (!editable) {
    return (
      <dl className="border-border bg-surface divide-border divide-y rounded-[10px] border text-[13px]">
        {[
          ['Carrier', order.carrier],
          ['Tracking', order.trackingNumber],
          ['Arrives', order.estimatedDelivery && formatDate(order.estimatedDelivery)],
          ['Ship to', order.shippingAddress],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-3 px-3.5 py-2">
            <dt className="text-text-muted w-16 shrink-0">{label}</dt>
            <dd className="min-w-0 break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <form
      onSubmit={form.handleSubmit((v) => save.mutate(v))}
      className="border-border bg-surface space-y-3 rounded-[10px] border p-3.5"
    >
      <h2 className="text-[13px] font-semibold">Fulfilment</h2>
      <FormField label="Status">
        <NativeSelect className="h-8 text-[13px]" {...form.register('status')}>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
      </FormField>
      <FormField label="Carrier">
        <Input className="h-8 text-[13px]" placeholder="UPS" {...form.register('carrier')} />
      </FormField>
      <FormField label="Tracking number">
        <Input className="h-8 font-mono text-[12px]" {...form.register('trackingNumber')} />
      </FormField>
      <FormField label="Expected delivery">
        <Input type="date" className="h-8 text-[13px]" {...form.register('estimatedDelivery')} />
      </FormField>
      {order.shippingAddress && (
        <p className="text-text-muted text-[12px]">Ships to {order.shippingAddress}</p>
      )}
      <Button
        type="submit"
        size="sm"
        className="w-full"
        disabled={!form.formState.isDirty || save.isPending}
      >
        {save.isPending ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
