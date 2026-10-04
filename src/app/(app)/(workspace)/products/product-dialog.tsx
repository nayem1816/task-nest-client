'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { parseMoney } from '@/lib/money';
import type { Product } from '@/lib/queries/commerce';
import { useWorkspaceKey } from '@/lib/queries/team';

const schema = z.object({
  name: z.string().trim().min(1, 'Give the product a name.').max(120),
  sku: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || /^[A-Za-z0-9._-]{1,40}$/.test(v),
      'Letters, digits, . _ and - only.',
    ),
  category: z.string().trim().max(60),
  price: z.string().refine((v) => parseMoney(v) !== null, 'Enter a price like 19.50.'),
  stock: z
    .string()
    .refine((v) => v.trim() === '' || /^\d+$/.test(v.trim()), 'Whole number, or empty.'),
  description: z.string().trim().max(2000),
});
type Values = z.infer<typeof schema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  product?: Product;
}

export function ProductDialog({ open, onOpenChange, product }: ProductDialogProps) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: product?.name ?? '',
      sku: product?.sku ?? '',
      category: product?.category ?? '',
      price: product ? (product.priceCents / 100).toFixed(2) : '',
      stock: product?.stockQuantity?.toString() ?? '',
      description: product?.description ?? '',
    },
  });

  const save = useMutation({
    mutationFn: async (v: Values) => {
      const body = {
        name: v.name,
        sku: v.sku,
        category: v.category,
        description: v.description,
        priceCents: parseMoney(v.price)!,
        stockQuantity: v.stock.trim() === '' ? null : Number(v.stock),
      };
      return product
        ? unwrap(
            await api.PATCH('/api/v1/products/{id}', {
              params: { path: { id: product.id } },
              body,
            }),
          )
        : unwrap(await api.POST('/api/v1/products', { body }));
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: key('products') });
      toast.success(product ? `${saved.name} updated.` : `${saved.name} added to the catalogue.`);
      onOpenChange(false);
    },
  });

  const { errors } = form.formState;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) save.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit product' : 'New product'}</DialogTitle>
          <DialogDescription>
            Past orders keep the name and price they were sold at.
          </DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))} className="space-y-4">
          {save.error && <FormAlert>{errorMessage(save.error)}</FormAlert>}
          <FormField label="Name" error={errors.name?.message}>
            <Input
              autoFocus
              className="h-9"
              placeholder="Ethiopia Guji, 12 oz"
              {...form.register('name')}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Price (USD)" error={errors.price?.message}>
              <Input
                inputMode="decimal"
                className="tabular h-9"
                placeholder="19.50"
                {...form.register('price')}
              />
            </FormField>
            <FormField label="SKU" error={errors.sku?.message}>
              <Input className="h-9 font-mono text-[13px]" {...form.register('sku')} />
            </FormField>
            <FormField label="Category" error={errors.category?.message}>
              <Input className="h-9" placeholder="Coffee" {...form.register('category')} />
            </FormField>
            <FormField
              label="In stock"
              error={errors.stock?.message}
              hint="Leave empty to not track stock."
            >
              <Input inputMode="numeric" className="tabular h-9" {...form.register('stock')} />
            </FormField>
          </div>
          <FormField
            label="Description"
            error={errors.description?.message}
            hint="Ingredients, size, roast level: what customers usually ask about."
          >
            <Textarea rows={3} {...form.register('description')} />
          </FormField>
          <SubmitButton pending={save.isPending} pendingLabel="Saving">
            {product ? 'Save changes' : 'Add product'}
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
