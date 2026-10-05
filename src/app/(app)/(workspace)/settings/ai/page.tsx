import type { Metadata } from 'next';
import { AiSettings } from './ai-settings';

export const metadata: Metadata = { title: 'AI' };

export default function AiSettingsPage() {
  return <AiSettings />;
}
