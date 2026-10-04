import { initials } from './initials';
import { isActive, NAV_GROUPS } from './nav-config';

const item = (href: string) => NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === href)!;

describe('isActive', () => {
  it('marks Home only on /app itself', () => {
    expect(isActive(item('/app'), '/app')).toBe(true);
    expect(isActive(item('/app'), '/settings/workspace')).toBe(false);
  });

  it('keeps Team active across members and teams pages', () => {
    const team = item('/settings/members');
    expect(isActive(team, '/settings/members')).toBe(true);
    expect(isActive(team, '/settings/teams')).toBe(true);
    expect(isActive(team, '/settings/roles')).toBe(false);
  });

  it('does not treat a shared prefix as a match', () => {
    expect(isActive(item('/settings/workspace'), '/settings/workspaces-archive')).toBe(false);
  });
});

describe('initials', () => {
  it.each([
    ['Maya Chen', 'MC'],
    ['Lucía Fernández', 'LF'],
    ['Northstar Coffee Co', 'NC'],
    ['erin', 'E'],
    ['   ', '?'],
  ])('%s → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});
