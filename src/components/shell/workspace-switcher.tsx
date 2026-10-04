'use client';

import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { CREATE_WORKSPACE_PATH, useWorkspace } from '@/lib/workspace/workspace-provider';
import { initials } from './initials';

export function WorkspaceSwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { current, workspaces, switchTo } = useWorkspace();
  const router = useRouter();
  if (!current) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'hover:bg-muted focus-visible:ring-ring/50 flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left outline-none focus-visible:ring-3',
          collapsed && 'justify-center',
        )}
        aria-label={`Workspace: ${current.name}. Switch workspace`}
      >
        <WorkspaceBadge name={current.name} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{current.name}</span>
              <span className="text-text-muted block truncate text-[12px]">
                {current.role.name}
              </span>
            </span>
            <ChevronsUpDown className="text-text-muted size-4 shrink-0" aria-hidden />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-text-muted text-[12px] font-normal">
          Workspaces
        </DropdownMenuLabel>
        {workspaces.map((w) => (
          <DropdownMenuItem
            key={w.id}
            onSelect={() => {
              if (w.id !== current.id) {
                switchTo(w.id);
                router.push('/app');
              }
            }}
          >
            <WorkspaceBadge name={w.name} small />
            <span className="min-w-0 flex-1 truncate">{w.name}</span>
            {w.id === current.id && <Check className="size-4" aria-label="Current workspace" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push(CREATE_WORKSPACE_PATH)}>
          <Plus className="size-4" aria-hidden />
          Create workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function WorkspaceBadge({ name, small = false }: { name: string; small?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'bg-text flex shrink-0 items-center justify-center rounded-md font-semibold text-white',
        small ? 'size-5 text-[10px]' : 'size-8 text-[12px]',
      )}
    >
      {initials(name)}
    </span>
  );
}
