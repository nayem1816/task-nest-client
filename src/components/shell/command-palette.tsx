'use client';

import { Building2, LogOut, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useAuth } from '@/lib/auth/auth-provider';
import { CREATE_WORKSPACE_PATH, useWorkspace } from '@/lib/workspace/workspace-provider';
import { NAV_GROUPS } from './nav-config';
import { SETTINGS_SECTIONS } from './settings-nav';

interface PaletteContextValue {
  open(): void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);

  return (
    <PaletteContext.Provider value={value}>
      {children}
      <CommandPalette open={isOpen} onOpenChange={setOpen} />
    </PaletteContext.Provider>
  );
}

export function useCommandPalette(): PaletteContextValue {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('useCommandPalette must be used inside <CommandPaletteProvider>');
  return ctx;
}

function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { current, workspaces, switchTo, can } = useWorkspace();

  const run = useCallback(
    (action: () => void) => {
      onOpenChange(false);
      action();
    },
    [onOpenChange],
  );

  const pages = NAV_GROUPS.flatMap((g) => g.items).filter(
    (item) => !item.permission || can(item.permission),
  );
  const settings = SETTINGS_SECTIONS.flatMap((s) => s.items).filter(
    (item) => !item.permission || can(item.permission),
  );
  const otherWorkspaces = workspaces.filter((w) => w.id !== current?.id);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Jump to a page or run an action"
    >
      <Command>
        <CommandInput placeholder="Where to?" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>

          <CommandGroup heading="Go to">
            {pages.map((item) => (
              <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                <item.icon aria-hidden />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Settings">
            {settings.map((item) => (
              <CommandItem
                key={item.href}
                value={`settings ${item.label} ${item.description}`}
                onSelect={() => run(() => router.push(item.href))}
              >
                <item.icon aria-hidden />
                {item.label}
                <span className="text-text-muted ml-auto truncate text-[12px]">
                  {item.description}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />
          <CommandGroup heading="Workspace">
            {otherWorkspaces.map((w) => (
              <CommandItem
                key={w.id}
                value={`switch to ${w.name}`}
                onSelect={() =>
                  run(() => {
                    switchTo(w.id);
                    router.push('/app');
                  })
                }
              >
                <Building2 aria-hidden />
                Switch to {w.name}
              </CommandItem>
            ))}
            <CommandItem onSelect={() => run(() => router.push(CREATE_WORKSPACE_PATH))}>
              <Plus aria-hidden />
              Create workspace
            </CommandItem>
            <CommandItem onSelect={() => run(() => void signOut())}>
              <LogOut aria-hidden />
              Sign out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
