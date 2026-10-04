'use client';

import { LoaderCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { FormAlert } from '@/components/forms/form-alert';
import { errorMessage } from '@/lib/api/errors';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  /** What will happen, in plain words: the impact, not "Are you sure?". */
  impact: React.ReactNode;
  confirmLabel: string;
  pending: boolean;
  error?: unknown;
  onConfirm(): void;
}

/** For destructive actions. Replaces window.confirm, and shows failures inline. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  impact,
  confirmLabel,
  pending,
  error,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{impact}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? <FormAlert>{errorMessage(error)}</FormAlert> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={onConfirm}>
            {pending && <LoaderCircle className="animate-spin" aria-hidden />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
