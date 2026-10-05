import {
  BookUser,
  House,
  Inbox,
  type LucideIcon,
  Package,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the current role grants this permission. */
  permission?: string;
  /** Also highlighted for these path prefixes. */
  matches?: string[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

/**
 * Only screens that exist are listed; each phase adds its own entries instead
 * of shipping placeholder links.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Home', href: '/app', icon: House },
      { label: 'Inbox', href: '/inbox', icon: Inbox, permission: 'conversation.read' },
      { label: 'Contacts', href: '/contacts', icon: BookUser, permission: 'contact.read' },
      { label: 'Orders', href: '/orders', icon: ShoppingBag, permission: 'commerce.read' },
      { label: 'Products', href: '/products', icon: Package, permission: 'commerce.read' },
    ],
  },
  {
    label: 'Management',
    items: [
      {
        label: 'Team',
        href: '/settings/members',
        icon: Users,
        permission: 'team.read',
        matches: ['/settings/members', '/settings/teams'],
      },
      { label: 'Settings', href: '/settings/workspace', icon: Settings },
    ],
  },
];

export function isActive(item: NavItem, pathname: string): boolean {
  if (pathname === item.href) return true;
  const prefixes = item.matches ?? (item.href === '/app' ? [] : [item.href]);
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
