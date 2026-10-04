import type { Metadata } from 'next';
import { OrderDetailView } from './order-detail';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderPage({ params }: PageProps<'/orders/[id]'>) {
  const { id } = await params;
  return <OrderDetailView id={id} />;
}
