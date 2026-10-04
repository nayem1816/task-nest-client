import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { VerifyEmail } from './verify-email';

export const metadata: Metadata = { title: 'Confirm your email' };

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Confirm your email">
      <Suspense>
        <VerifyEmail />
      </Suspense>
    </AuthShell>
  );
}
