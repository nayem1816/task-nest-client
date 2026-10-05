import type { Metadata } from 'next';
import { WebsiteChatSettings } from './website-chat-settings';

export const metadata: Metadata = { title: 'Website chat' };

export default async function WebsiteChatPage({ params }: PageProps<'/settings/channels/[id]'>) {
  const { id } = await params;
  return <WebsiteChatSettings id={id} />;
}
