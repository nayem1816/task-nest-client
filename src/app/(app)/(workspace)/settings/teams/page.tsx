import type { Metadata } from 'next';
import { TeamsSettings } from './teams-settings';

export const metadata: Metadata = { title: 'Teams' };

export default function TeamsPage() {
  return <TeamsSettings />;
}
