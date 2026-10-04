import { describeEntry } from './describe-entry';

const entry = (action: string, metadata: Record<string, unknown> | null = null) => ({
  action,
  actorLabel: 'Maya Chen',
  metadata,
});

describe('describeEntry', () => {
  it.each([
    [
      entry('member.role_changed', {
        member: 'tom@northstarcoffee.co',
        from: 'agent',
        to: 'manager',
      }),
      'Maya Chen changed tom@northstarcoffee.co from Agent to Manager',
    ],
    [
      entry('invitation.sent', { email: 'sam@northstarcoffee.co', role: 'sales' }),
      'Maya Chen invited sam@northstarcoffee.co as Sales',
    ],
    [
      entry('member.removed', { member: 'erin@northstarcoffee.co', name: 'Erin Walsh' }),
      'Maya Chen removed Erin Walsh from the workspace',
    ],
    [
      entry('team.updated', { name: { from: 'Support', to: 'Customer Care' } }),
      'Maya Chen renamed Support to Customer Care',
    ],
    [
      entry('team.members_changed', { team: 'Wholesale', added: ['a', 'b'], removed: ['c'] }),
      'Maya Chen added 2 people and removed 1 on Wholesale',
    ],
    [
      entry('organization.updated', { businessType: { from: null, to: 'ecommerce' } }),
      'Maya Chen changed the workspace business type',
    ],
  ])('%#', (input, expected) => {
    expect(describeEntry(input)).toBe(expected);
  });

  it('copes with missing metadata and unknown actions', () => {
    expect(describeEntry(entry('member.disabled'))).toBe(
      'Maya Chen turned off access for a member',
    );
    expect(describeEntry({ ...entry('billing.plan_changed'), actorLabel: null })).toBe(
      'Someone: billing.plan_changed',
    );
  });
});
