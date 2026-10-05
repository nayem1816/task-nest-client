'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { InboxFilters } from '@/lib/queries/inbox';
import { ConversationList } from './conversation-list';

/**
 * Desktop: the list stays put while conversations open beside it. Phones: the
 * list and a conversation are separate screens, so the thread gets the width.
 */
export default function InboxLayout({ children }: LayoutProps<'/inbox'>) {
  const pathname = usePathname();
  const inConversation = pathname !== '/inbox';
  // Lives in the layout so switching conversations keeps the filters.
  const [filters, setFilters] = useState<InboxFilters>({ view: 'all', status: 'open' });

  return (
    <div className="flex h-[calc(100dvh-3rem)] min-h-0">
      <div
        className={cn(
          'border-border bg-surface w-full shrink-0 flex-col border-r md:flex md:w-[320px] lg:w-[340px]',
          inConversation ? 'hidden' : 'flex',
        )}
      >
        <ConversationList filters={filters} onFiltersChange={setFilters} />
      </div>
      <div className={cn('min-w-0 flex-1', inConversation ? 'flex' : 'hidden md:flex')}>
        {children}
      </div>
    </div>
  );
}
