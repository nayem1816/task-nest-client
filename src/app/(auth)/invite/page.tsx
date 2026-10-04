import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { AcceptInvitation } from './accept-invitation';

export const metadata: Metadata = { title: 'Join a workspace' };

export default function InvitePage() {
  return (
    <AuthShell title="Join a workspace">
      <Suspense>
        <AcceptInvitation />
      </Suspense>
    </AuthShell>
  );
}
