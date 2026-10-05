import type { Metadata } from 'next';
import { ChatWidget } from './chat-widget';

export const metadata: Metadata = { title: 'Chat', robots: { index: false } };

/** Loaded in an iframe by /widget.js on the customer's website. */
export default async function WidgetPage({ params, searchParams }: PageProps<'/widget/[key]'>) {
  const { key } = await params;
  const { origin } = await searchParams;
  return (
    <>
      {/* The iframe sits over the host page; only the launcher and panel should show. */}
      <style>{'html,body{background:transparent!important}'}</style>
      <ChatWidget publicKey={key} pageOrigin={typeof origin === 'string' ? origin : null} />
    </>
  );
}
