'use client';

import { Menu, PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { CommandPaletteProvider, useCommandPalette } from './command-palette';
import { modKeyLabel } from './mod-key';
import { isActive, NAV_GROUPS } from './nav-config';
import { UserMenu } from './user-menu';
import { WorkspaceSwitcher } from './workspace-switcher';

const COLLAPSED_KEY = 'tasknest.sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  // The shell only renders in the browser (behind RequireAuth), so reading
  // storage in the initializer cannot cause a hydration mismatch.
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1');
      } catch {
        // Not remembered across reloads; fine.
      }
      return !value;
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <CommandPaletteProvider>
        <div className="bg-canvas flex min-h-dvh">
          <aside
            className={cn(
              'border-border bg-surface sticky top-0 hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-200 lg:flex',
              collapsed ? 'w-16' : 'w-[248px]',
            )}
          >
            <SidebarContents collapsed={collapsed} />
            <div className="border-border border-t p-2">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="text-text-muted hover:bg-muted hover:text-text focus-visible:ring-ring/50 flex h-8 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] outline-none focus-visible:ring-3"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-[18px]" aria-hidden />
                ) : (
                  <>
                    <PanelLeftClose className="size-[18px]" aria-hidden />
                    Collapse
                  </>
                )}
              </button>
            </div>
          </aside>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetContent side="left" className="w-[272px] gap-0 p-0" showCloseButton={false}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContents collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onOpenMenu={() => setMobileOpen(true)} />
            <div className="flex-1">{children}</div>
          </div>
        </div>
        <Toaster />
      </CommandPaletteProvider>
    </TooltipProvider>
  );
}

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function SidebarContents({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  /** Lets the mobile drawer close once a link is chosen. */
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { can } = useWorkspace();

  return (
    <>
      <div className="p-2">
        <WorkspaceSwitcher collapsed={collapsed} />
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 pb-2">
        {NAV_GROUPS.map((group, index) => {
          const items = group.items.filter((item) => !item.permission || can(item.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.label ?? index} className="mt-3 first:mt-1">
              {group.label && !collapsed && (
                <p className="text-text-muted px-2.5 pb-1 text-[12px] font-medium">{group.label}</p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item, pathname);
                  const link = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'focus-visible:ring-ring/50 flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13px] outline-none focus-visible:ring-3',
                        active
                          ? 'bg-muted text-text font-medium'
                          : 'text-text-muted hover:bg-muted hover:text-text',
                        collapsed && 'justify-center px-0',
                      )}
                    >
                      <item.icon className="size-[18px] shrink-0" aria-hidden />
                      {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-border border-t p-2">
        <UserMenu collapsed={collapsed} />
      </div>
    </>
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu(): void }) {
  const palette = useCommandPalette();
  const [modKey] = useState(modKeyLabel);

  return (
    <header className="border-border bg-surface/90 sticky top-0 z-30 flex h-12 items-center gap-2 border-b px-4 backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        className="text-text-muted hover:bg-muted -ml-1.5 flex size-8 items-center justify-center rounded-lg lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      <button
        type="button"
        onClick={palette.open}
        className="border-border text-text-muted hover:border-input focus-visible:ring-ring/50 ml-auto flex h-8 w-full max-w-[280px] items-center gap-2 rounded-lg border px-2.5 text-[13px] outline-none focus-visible:ring-3"
      >
        <Search className="size-4" aria-hidden />
        <span className="flex-1 text-left">Search or jump to…</span>
        <kbd className="bg-muted hidden rounded px-1.5 py-0.5 font-sans text-[11px] sm:inline">
          {modKey} K
        </kbd>
      </button>
    </header>
  );
}
