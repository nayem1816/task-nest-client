'use client';

import { Search, SearchX, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/components/commerce/order-status';
import { OrdersTable } from '@/components/commerce/orders-table';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { type OrderStatus, useOrders } from '@/lib/queries/commerce';
import { useDebouncedValue } from '@/lib/use-debounced-value';

export function OrdersList() {
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const search = useDebouncedValue(searchInput.trim());
  // Set when arriving from a contact's page ("All 7 orders").
  const contactId = useSearchParams().get('contact') ?? undefined;
  const orders = useOrders({ search, status: status || undefined, contactId });

  const rows = orders.data?.pages.flatMap((p) => p.data) ?? [];
  const filtered = Boolean(search || status || contactId);
  const customer = contactId ? rows.find((o) => o.contact?.id === contactId)?.contact : undefined;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Orders"
        description="What customers bought, and where each order is now."
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search
            aria-hidden
            className="text-text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Order number, name or email"
            aria-label="Search orders"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <NativeSelect
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus | '')}
          className="h-8 w-44 text-[13px]"
        >
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {ORDER_STATUS_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        {contactId && (
          <p className="text-text-muted text-[13px]">
            Orders from {customer?.displayName ?? 'one customer'} ·{' '}
            <Link href="/orders" className="text-brand hover:underline">
              Show all
            </Link>
          </p>
        )}
      </div>

      {orders.isPending && <ListSkeleton rows={8} />}
      {orders.isError && <ErrorState error={orders.error} onRetry={() => void orders.refetch()} />}
      {orders.isSuccess && rows.length === 0 && !filtered && (
        <EmptyState icon={ShoppingBag} title="No orders yet">
          Orders recorded through the API show up here with their status, items and shipping.
          Connecting a store is coming with integrations.
        </EmptyState>
      )}
      {orders.isSuccess && rows.length === 0 && filtered && (
        <EmptyState icon={SearchX} title="No orders match">
          Search by the number a customer quotes, like 10482, or by their name or email.
        </EmptyState>
      )}

      {rows.length > 0 && <OrdersTable orders={rows} />}

      {orders.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void orders.fetchNextPage()}
          disabled={orders.isFetchingNextPage}
        >
          {orders.isFetchingNextPage ? 'Loading…' : 'Load older orders'}
        </Button>
      )}
    </div>
  );
}
