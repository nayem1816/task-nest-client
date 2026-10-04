const STAGES: Record<string, string> = { VISITOR: 'Visitor', LEAD: 'Lead', CUSTOMER: 'Customer' };
const FIELDS: Record<string, string> = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  location: 'location',
};

export interface ActivityLike {
  type: string;
  actorLabel: string | null;
  metadata: Record<string, unknown> | null;
}

/** One line per timeline entry. Unknown types still render, as the raw type. */
export function describeActivity({ type, actorLabel, metadata }: ActivityLike): string {
  const who = actorLabel ?? 'Someone';
  const m = metadata ?? {};
  const list = (key: string) =>
    Array.isArray(m[key]) ? (m[key] as unknown[]).filter((v) => typeof v === 'string') : [];

  switch (type) {
    case 'contact.created':
      return m.source === 'manual' ? `${who} added this contact` : 'Contact created';
    case 'contact.updated': {
      const fields = list('fields').map((f) => FIELDS[f as string] ?? f);
      return `${who} updated ${joinWords(fields as string[]) || 'details'}`;
    }
    case 'stage.changed':
      return `${who} moved them from ${STAGES[m.from as string] ?? m.from} to ${STAGES[m.to as string] ?? m.to}`;
    case 'tags.changed': {
      const added = list('added') as string[];
      const removed = list('removed') as string[];
      const parts = [
        added.length && `added ${joinWords(added)}`,
        removed.length && `removed ${joinWords(removed)}`,
      ].filter(Boolean);
      return `${who} ${parts.join(' and ')}`;
    }
    case 'note.added':
      return `${who} added a note`;
    default:
      return type;
  }
}

function joinWords(words: string[]): string {
  if (words.length <= 1) return words[0] ?? '';
  return `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}
