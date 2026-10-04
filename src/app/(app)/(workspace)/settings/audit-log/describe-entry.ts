export interface AuditEntryLike {
  action: string;
  actorLabel: string | null;
  metadata: Record<string, unknown> | null;
}

/** Filter options, in the order an admin is most likely to look for them. */
export const AUDIT_ACTIONS: { value: string; label: string }[] = [
  { value: 'member.role_changed', label: 'Role changed' },
  { value: 'member.disabled', label: 'Access turned off' },
  { value: 'member.enabled', label: 'Access restored' },
  { value: 'member.removed', label: 'Member removed' },
  { value: 'invitation.sent', label: 'Invitation sent' },
  { value: 'invitation.accepted', label: 'Invitation accepted' },
  { value: 'invitation.revoked', label: 'Invitation revoked' },
  { value: 'team.created', label: 'Team created' },
  { value: 'team.updated', label: 'Team renamed' },
  { value: 'team.members_changed', label: 'Team members changed' },
  { value: 'team.deleted', label: 'Team deleted' },
  { value: 'organization.updated', label: 'Workspace details changed' },
  { value: 'organization.created', label: 'Workspace created' },
];

const ROLE_NAMES: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  manager: 'Manager',
  agent: 'Agent',
  sales: 'Sales',
  viewer: 'Viewer',
};

/** One readable sentence per entry. Unknown actions fall back to the raw action name. */
export function describeEntry(entry: AuditEntryLike): string {
  const actor = entry.actorLabel ?? 'Someone';
  const m = entry.metadata ?? {};
  const str = (key: string) => (typeof m[key] === 'string' ? (m[key] as string) : undefined);
  const role = (key: string) => {
    const value = str(key);
    return value ? (ROLE_NAMES[value] ?? value) : 'another role';
  };
  const count = (key: string) => (Array.isArray(m[key]) ? (m[key] as unknown[]).length : 0);

  switch (entry.action) {
    case 'organization.created':
      return `${actor} created the workspace`;
    case 'organization.updated': {
      const fields = Object.keys(m).map((f) => (f === 'businessType' ? 'business type' : f));
      return `${actor} changed the workspace ${fields.join(' and ') || 'details'}`;
    }
    case 'member.role_changed':
      return `${actor} changed ${str('member') ?? 'a member'} from ${role('from')} to ${role('to')}`;
    case 'member.disabled':
      return `${actor} turned off access for ${str('member') ?? 'a member'}`;
    case 'member.enabled':
      return `${actor} restored access for ${str('member') ?? 'a member'}`;
    case 'member.removed':
      return `${actor} removed ${str('name') ?? str('member') ?? 'a member'} from the workspace`;
    case 'invitation.sent':
      return `${actor} invited ${str('email') ?? 'someone'} as ${role('role')}`;
    case 'invitation.accepted':
      return `${actor} joined as ${role('role')}`;
    case 'invitation.revoked':
      return `${actor} revoked the invitation for ${str('email') ?? 'someone'}`;
    case 'team.created':
      return `${actor} created the team ${str('name') ?? ''}`.trimEnd();
    case 'team.updated': {
      const name = m.name as { from?: string; to?: string } | undefined;
      return name?.from && name.to && name.from !== name.to
        ? `${actor} renamed ${name.from} to ${name.to}`
        : `${actor} updated the team ${name?.to ?? ''}`.trimEnd();
    }
    case 'team.deleted':
      return `${actor} deleted the team ${str('name') ?? ''}`.trimEnd();
    case 'team.members_changed': {
      const added = count('added');
      const removed = count('removed');
      const parts = [
        added && `added ${added} ${added === 1 ? 'person' : 'people'}`,
        removed && `removed ${removed}`,
      ].filter(Boolean);
      return `${actor} ${parts.join(' and ')} on ${str('team') ?? 'a team'}`;
    }
    default:
      return `${actor}: ${entry.action}`;
  }
}
