'use client';

import { Keyboard, LogOut, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/lib/auth/auth-provider';
import { cn } from '@/lib/utils';
import { initials } from './initials';
import { useCommandPalette } from './command-palette';
import { modKeyLabel } from './mod-key';

export function UserMenu({ collapsed = false }: { collapsed?: boolean }) {
  const { state, signOut } = useAuth();
  const router = useRouter();
  const palette = useCommandPalette();
  if (state.status !== 'authenticated') return null;
  const { user } = state;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'hover:bg-muted focus-visible:ring-ring/50 flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none focus-visible:ring-3',
          collapsed && 'justify-center',
        )}
        aria-label={`Account: ${user.name}`}
      >
        <span
          aria-hidden
          className="bg-muted text-text flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
        >
          {initials(user.name)}
        </span>
        {!collapsed && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{user.name}</span>
            <span className="text-text-muted block truncate text-[12px]">{user.email}</span>
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-60">
        <DropdownMenuLabel className="text-text-muted truncate text-[12px] font-normal">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => router.push('/settings/account')}>
          <UserRound aria-hidden />
          Your account
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => palette.open()}>
          <Keyboard aria-hidden />
          Command menu
          <DropdownMenuShortcut>{modKeyLabel()} K</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
