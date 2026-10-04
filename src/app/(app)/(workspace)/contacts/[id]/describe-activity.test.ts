import { describeActivity } from './describe-activity';

const a = (type: string, metadata: Record<string, unknown> | null = null) => ({
  type,
  actorLabel: 'Tom Becker',
  metadata,
});

describe('describeActivity', () => {
  it.each([
    [a('contact.created', { source: 'manual' }), 'Tom Becker added this contact'],
    [a('contact.created', { source: 'import' }), 'Contact created'],
    [
      a('contact.updated', { fields: ['email', 'location'] }),
      'Tom Becker updated email and location',
    ],
    [
      a('contact.updated', { fields: ['name', 'phone', 'company'] }),
      'Tom Becker updated name, phone and company',
    ],
    [
      a('stage.changed', { from: 'LEAD', to: 'CUSTOMER' }),
      'Tom Becker moved them from Lead to Customer',
    ],
    [
      a('tags.changed', { added: ['VIP'], removed: ['Newsletter', 'Gift order'] }),
      'Tom Becker added VIP and removed Newsletter and Gift order',
    ],
    [a('note.added', { excerpt: 'Prefers whole bean' }), 'Tom Becker added a note'],
    [a('order.placed'), 'order.placed'],
  ])('%#', (input, expected) => {
    expect(describeActivity(input)).toBe(expected);
  });
});
