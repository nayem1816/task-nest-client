import { groupPermissions } from './permission-groups';

describe('groupPermissions', () => {
  it('groups by area and keeps the catalog order', () => {
    const groups = groupPermissions([
      { key: 'conversation.read', description: 'View conversations' },
      { key: 'conversation.reply', description: 'Reply' },
      { key: 'analytics.view', description: 'View analytics' },
      { key: 'report.manage', description: 'Manage reports' },
      { key: 'billing.manage', description: 'Billing' },
      { key: 'mystery.thing', description: 'Unknown' },
    ]);

    expect(groups.map((g) => [g.area, g.permissions.map((p) => p.key)])).toEqual([
      ['Conversations', ['conversation.read', 'conversation.reply']],
      ['Analytics and reports', ['analytics.view', 'report.manage']],
      ['Workspace', ['billing.manage']],
      ['Other', ['mystery.thing']],
    ]);
  });
});
