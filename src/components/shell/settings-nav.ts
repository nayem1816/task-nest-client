import {
  Building2,
  KeyRound,
  type LucideIcon,
  MessagesSquare,
  Sparkles,
  ScrollText,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react';

export interface SettingsItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
  permission?: string;
}

export const SETTINGS_SECTIONS: { label: string; items: SettingsItem[] }[] = [
  {
    label: 'Workspace',
    items: [
      {
        label: 'General',
        href: '/settings/workspace',
        icon: Building2,
        description: 'Name, business type and time zone',
      },
      {
        label: 'Channels',
        href: '/settings/channels',
        icon: MessagesSquare,
        description: 'Website chat and the other places customers reach you',
        permission: 'channel.manage',
      },
      {
        label: 'AI',
        href: '/settings/ai',
        icon: Sparkles,
        description: 'Whether AI is connected, and how much it is used',
        permission: 'agent.read',
      },
      {
        label: 'Members',
        href: '/settings/members',
        icon: Users,
        description: 'Invite people and manage their access',
        permission: 'team.read',
      },
      {
        label: 'Teams',
        href: '/settings/teams',
        icon: UsersRound,
        description: 'Group members for routing and reporting',
        permission: 'team.read',
      },
      {
        label: 'Roles',
        href: '/settings/roles',
        icon: KeyRound,
        description: 'What each role can do',
        permission: 'team.read',
      },
      {
        label: 'Audit log',
        href: '/settings/audit-log',
        icon: ScrollText,
        description: 'Who changed what, and when',
        permission: 'audit.read',
      },
    ],
  },
  {
    label: 'You',
    items: [
      {
        label: 'Account',
        href: '/settings/account',
        icon: UserRound,
        description: 'Profile, email and signed-in devices',
      },
    ],
  },
];
