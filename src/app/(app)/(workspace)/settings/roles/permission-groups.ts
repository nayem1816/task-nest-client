/** Area names for the first segment of a permission key ("conversation.reply" → Conversations). */
const AREAS: Record<string, string> = {
  conversation: 'Conversations',
  contact: 'Contacts',
  lead: 'Leads',
  commerce: 'Products and orders',
  knowledge: 'Knowledge base',
  agent: 'AI agents',
  automation: 'Automation',
  analytics: 'Analytics and reports',
  report: 'Analytics and reports',
  team: 'Team',
  channel: 'Channels and integrations',
  integration: 'Channels and integrations',
  apikey: 'Channels and integrations',
  audit: 'Workspace',
  settings: 'Workspace',
  billing: 'Workspace',
};

export interface PermissionGroup {
  area: string;
  permissions: { key: string; description: string }[];
}

/** Groups the catalog by area, keeping the API's order within and between areas. */
export function groupPermissions(
  catalog: { key: string; description: string }[],
): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const permission of catalog) {
    const prefix = permission.key.split('.')[0] ?? permission.key;
    const area = AREAS[prefix] ?? 'Other';
    const group = groups.get(area) ?? { area, permissions: [] };
    group.permissions.push(permission);
    groups.set(area, group);
  }
  return [...groups.values()];
}
