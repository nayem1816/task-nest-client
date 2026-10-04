'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MoreHorizontal, Package, Plus, Search, SearchX } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { formatMoney } from '@/lib/money';
import { type Product, type ProductStatus, useProducts } from '@/lib/queries/commerce';
import { useWorkspaceKey } from '@/lib/queries/team';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { ProductDialog } from './product-dialog';

export function ProductsList() {
  const { can } = useWorkspace();
  const canManage = can('commerce.manage');
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('ACTIVE');
  const search = useDebouncedValue(searchInput.trim());
  const products = useProducts({ search, status: status || undefined });
  const [editing, setEditing] = useState<Product | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const setArchived = useMutation({
    mutationFn: async ({ product, archived }: { product: Product; archived: boolean }) =>
      unwrap(
        await api.PATCH('/api/v1/products/{id}', {
          params: { path: { id: product.id } },
          body: { status: archived ? 'ARCHIVED' : 'ACTIVE' },
        }),
      ),
    onSuccess: async (p) => {
      await queryClient.invalidateQueries({ queryKey: key('products') });
      toast.success(
        p.status === 'ARCHIVED'
          ? `${p.name} archived. It can no longer be ordered.`
          : `${p.name} is back on sale.`,
      );
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const rows = products.data?.pages.flatMap((p) => p.data) ?? [];
  const filtered = Boolean(search) || status !== 'ACTIVE';
  const openDialog = (product?: Product) => {
    setEditing(product);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Products"
        description="Your catalogue. Orders are priced from it, so past orders keep the price they were sold at."
        actions={
          canManage && (
            <Button onClick={() => openDialog()}>
              <Plus aria-hidden />
              New product
            </Button>
          )
        }
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
            placeholder="Name, SKU or category"
            aria-label="Search products"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <NativeSelect
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as ProductStatus | '')}
          className="h-8 w-36 text-[13px]"
        >
          <option value="ACTIVE">On sale</option>
          <option value="ARCHIVED">Archived</option>
          <option value="">All products</option>
        </NativeSelect>
      </div>

      {products.isPending && <ListSkeleton rows={6} />}
      {products.isError && (
        <ErrorState error={products.error} onRetry={() => void products.refetch()} />
      )}
      {products.isSuccess && rows.length === 0 && !filtered && (
        <EmptyState
          icon={Package}
          title="No products yet"
          action={
            canManage && (
              <Button variant="outline" size="sm" onClick={() => openDialog()}>
                Add a product
              </Button>
            )
          }
        >
          Add what you sell, with prices and stock, so orders can be recorded against it.
        </EmptyState>
      )}
      {products.isSuccess && rows.length === 0 && filtered && (
        <EmptyState icon={SearchX} title="No products match">
          Try another search, or show all products.
        </EmptyState>
      )}

      {rows.length > 0 && (
        <div className="border-border bg-surface overflow-x-auto rounded-[10px] border">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-text-muted border-border border-b text-[12px]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 text-right font-medium">Price</th>
                <th className="px-4 py-2.5 text-right font-medium">Stock</th>
                <th className="w-10 px-2 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {rows.map((p) => (
                <tr key={p.id} className={cn(p.status === 'ARCHIVED' && 'text-text-muted')}>
                  <td className="px-4 py-2">
                    <span className="block text-sm font-medium">{p.name}</span>
                    {p.sku && (
                      <span className="text-text-muted font-mono text-[12px]">{p.sku}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p.category ?? '—'}</td>
                  <td className="tabular px-4 py-2 text-right">
                    {formatMoney(p.priceCents, p.currency)}
                  </td>
                  <td className="tabular px-4 py-2 text-right whitespace-nowrap">
                    <StockLabel quantity={p.stockQuantity} />
                  </td>
                  <td className="px-2 py-2 text-right">
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${p.name}`}
                          >
                            <MoreHorizontal aria-hidden />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => openDialog(p)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              setArchived.mutate({ product: p, archived: p.status === 'ACTIVE' })
                            }
                          >
                            {p.status === 'ACTIVE' ? 'Archive' : 'Put back on sale'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {products.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void products.fetchNextPage()}
          disabled={products.isFetchingNextPage}
        >
          {products.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}

      {canManage && (
        <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
      )}
    </div>
  );
}

function StockLabel({ quantity }: { quantity: number | null }) {
  if (quantity === null) return <span className="text-text-muted">Not tracked</span>;
  if (quantity === 0) return <span className="text-danger font-medium">Out of stock</span>;
  if (quantity < 10) return <span className="text-warning font-medium">{quantity} left</span>;
  return <>{quantity}</>;
}
