import type { Metadata } from 'next';
import { ConversationView } from './conversation-view';

export const metadata: Metadata = { title: 'Inbox' };

export default async function ConversationPage({ params }: PageProps<'/inbox/[id]'>) {
  const { id } = await params;
  return <ConversationView id={id} />;
}
