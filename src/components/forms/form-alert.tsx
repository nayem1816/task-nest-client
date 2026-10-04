import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormAlertProps {
  tone?: 'error' | 'success';
  children: React.ReactNode;
}

/** A message about the whole form, as opposed to a single field. */
export function FormAlert({ tone = 'error', children }: FormAlertProps) {
  const Icon = tone === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex gap-2 rounded-lg border px-3 py-2.5 text-[13px]',
        tone === 'error'
          ? 'border-danger/25 bg-danger/5 text-danger'
          : 'border-success/25 bg-success/5 text-success',
      )}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <div className="text-text">{children}</div>
    </div>
  );
}
