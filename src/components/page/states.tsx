import type { LucideIcon } from 'lucide-react';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorMessage, ApiError } from '@/lib/api/errors';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  /** Why this matters and what to do next. */
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, children, action }: EmptyStateProps) {
  return (
    <div className="border-border flex flex-col items-center rounded-[10px] border border-dashed px-6 py-12 text-center">
      <Icon className="text-text-muted size-5" aria-hidden />
      <p className="mt-3 font-medium">{title}</p>
      <div className="text-text-muted mt-1 max-w-sm text-[13px]">{children}</div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const requestId = error instanceof ApiError ? error.requestId : undefined;
  return (
    <div
      role="alert"
      className="border-danger/25 bg-danger/5 flex flex-col items-start gap-2 rounded-[10px] border px-4 py-3"
    >
      <p className="flex items-center gap-2 font-medium">
        <CircleAlert className="text-danger size-4" aria-hidden />
        {errorMessage(error)}
      </p>
      <div className="flex items-center gap-3">
        {onRetry && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        )}
        {requestId && (
          <span className="text-text-muted tabular text-[12px]">Reference: {requestId}</span>
        )}
      </div>
    </div>
  );
}

/** Rows of grey bars shaped like the table or list that is loading. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="border-border divide-border divide-y rounded-[10px] border" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="bg-muted size-7 animate-pulse rounded-full" />
          <div className="flex-1 space-y-1.5">
            <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
            <div className="bg-muted h-2.5 w-1/4 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
