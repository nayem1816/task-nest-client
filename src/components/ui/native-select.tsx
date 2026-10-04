import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A styled native <select>. For short, fixed option lists it beats a custom
 * listbox: keyboard, screen readers and mobile pickers work without extra code.
 */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(
          'border-input h-9 w-full appearance-none rounded-lg border bg-transparent pr-8 pl-2.5 text-sm outline-none',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:ring-3',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="text-text-muted pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
        aria-hidden
      />
    </div>
  );
}
