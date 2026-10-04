import type { Metadata } from 'next';
import { AccountOverview } from './account-overview';

export const metadata: Metadata = { title: 'Your account' };

// Placeholder home until the workspace shell lands; it exercises the full
// session lifecycle (verify, list devices, sign out) against the real API.
export default function AppHomePage() {
  return <AccountOverview />;
}
