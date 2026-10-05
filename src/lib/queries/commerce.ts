'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useWorkspaceKey } from './team';

export type Product = components['schemas']['ProductDto'];
export type Order = components['schemas']['OrderDto'];
export type OrderSummary = components['schemas']['OrderSummaryDto'];
export type OrderStatus = Order['status'];
export type ProductStatus = Product['status'];

export function useProducts(filters: { search?: string; status?: ProductStatus }) {
  const key = useWorkspaceKey();
  return useInfiniteQuery({
    queryKey: key('products', 'list', JSON.stringify(filters)),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['ProductPageDto']> =>
      unwrap(
        await api.GET('/api/v1/products', {
          params: {
            query: {
              search: filters.search || undefined,
              status: filters.status,
              cursor: pageParam,
              limit: 50,
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
  });
}

export function useOrders(
  filters: { search?: string; status?: OrderStatus; contactId?: string },
  enabled = true,
) {
  const key = useWorkspaceKey();
  return useInfiniteQuery({
    queryKey: key('orders', 'list', JSON.stringify(filters)),
    initialPageParam: undefined as number | undefined,
    queryFn: async ({ pageParam }): Promise<components['schemas']['OrderPageDto']> =>
      unwrap(
        await api.GET('/api/v1/orders', {
          params: {
            query: {
              search: filters.search || undefined,
              status: filters.status,
              contactId: filters.contactId,
              cursor: pageParam,
              limit: 50,
            },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
    enabled,
  });
}

export function useOrder(id: string) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('orders', 'detail', id),
    queryFn: async () => unwrap(await api.GET('/api/v1/orders/{id}', { params: { path: { id } } })),
  });
}

export function useOrderSummary(contactId: string, enabled = true) {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('orders', 'summary', contactId),
    queryFn: async () =>
      unwrap(await api.GET('/api/v1/orders/summary', { params: { query: { contactId } } })),
    enabled,
  });
}
