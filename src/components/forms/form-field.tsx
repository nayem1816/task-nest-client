import { cloneElement, type ReactElement, useId } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered to the right of the label, e.g. a "Forgot password?" link. */
  aside?: React.ReactNode;
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label, control, hint and error, wired together for screen readers. */
export function FormField({ label, error, hint, aside, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [errorId, hintId].filter(Boolean).join(' ') || undefined,
      })}
      {error ? (
        <p id={errorId} className="text-danger text-[13px]">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-text-muted text-[13px]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
