'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SETTINGS_SECTIONS } from '@/components/shell/settings-nav';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

export function SettingsNav() {
  const pathname = usePathname();
  const { can } = useWorkspace();

  return (
    <nav aria-label="Settings" className="md:w-48 md:shrink-0">
      {/* Phones: one scrollable row. Wider: grouped list on the left. */}
      <div className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-col md:gap-5 md:overflow-visible md:px-0">
        {SETTINGS_SECTIONS.map((section) => {
          const items = section.items.filter((i) => !i.permission || can(i.permission));
          if (items.length === 0) return null;
          return (
            <div key={section.label} className="contents md:block">
              <p className="text-text-muted hidden px-2.5 pb-1 text-[12px] font-medium md:block">
                {section.label}
              </p>
              <ul className="contents md:block md:space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href} className="shrink-0">
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'focus-visible:ring-ring/50 flex h-8 items-center rounded-lg px-2.5 text-[13px] whitespace-nowrap outline-none focus-visible:ring-3',
                          active
                            ? 'bg-muted text-text font-medium'
                            : 'text-text-muted hover:bg-muted hover:text-text',
                        )}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
