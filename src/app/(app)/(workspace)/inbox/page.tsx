import { Inbox } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inbox' };

export default function InboxIndexPage() {
  return (
    <div className="text-text-muted flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <Inbox className="size-5" aria-hidden />
      <p className="text-text font-medium">Pick a conversation</p>
      <p className="max-w-xs text-[13px]">
        The customer&apos;s details, orders and earlier conversations open alongside it.
      </p>
    </div>
  );
}
