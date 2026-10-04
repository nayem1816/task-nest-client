import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignupForm } from './signup-form';

export const metadata: Metadata = { title: 'Create your account' };

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      description="Start with your own login. You can invite your team once your workspace is set up."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
