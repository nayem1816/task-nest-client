import type { LifecycleStage } from '@/lib/queries/contacts';
import { cn } from '@/lib/utils';

/** Palette keys the API accepts for tags. */
export const TAG_COLOR_KEYS = [
  'slate',
  'blue',
  'green',
  'amber',
  'red',
  'violet',
  'teal',
  'pink',
] as const;
export type TagColor = (typeof TAG_COLOR_KEYS)[number];

/** Each key mapped to classes with enough contrast on white. */
const TAG_STYLES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-800',
  red: 'bg-red-50 text-red-700',
  violet: 'bg-violet-50 text-violet-700',
  teal: 'bg-teal-50 text-teal-700',
  pink: 'bg-pink-50 text-pink-700',
} satisfies Record<TagColor, string>;

export function TagChip({
  name,
  color,
  className,
}: {
  name: string;
  color: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-md px-1.5 text-[12px] font-medium whitespace-nowrap',
        TAG_STYLES[color] ?? TAG_STYLES.slate,
        className,
      )}
    >
      {name}
    </span>
  );
}

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  VISITOR: 'Visitor',
  LEAD: 'Lead',
  CUSTOMER: 'Customer',
};

const STAGE_DOT: Record<LifecycleStage, string> = {
  VISITOR: 'bg-slate-400',
  LEAD: 'bg-amber-500',
  CUSTOMER: 'bg-green-600',
};

/** Stage as a dot plus a word, so it never relies on colour alone. */
export function StageLabel({ stage }: { stage: LifecycleStage }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden className={cn('size-1.5 rounded-full', STAGE_DOT[stage])} />
      {STAGE_LABELS[stage]}
    </span>
  );
}
