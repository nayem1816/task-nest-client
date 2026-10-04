'use client';

import { CircleCheck, Circle } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/page/page-header';
import { useAuth } from '@/lib/auth/auth-provider';
import { useInvitations, useMembers } from '@/lib/queries/team';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

interface Step {
  title: string;
  detail: string;
  done: boolean;
  href: string;
  cta: string;
}

/**
 * Until the dashboard has real activity to show, home is a setup checklist.
 * Every step reflects actual state; steps for features that are not built yet
 * are not listed.
 */
export function Home() {
  const { state } = useAuth();
  const { current, can } = useWorkspace();
  const canSeeTeam = can('team.read');
  const members = useMembers(canSeeTeam);
  const invitations = useInvitations(canSeeTeam);

  if (state.status !== 'authenticated' || !current) return null;
  const firstName = state.user.name.split(/\s+/)[0];

  const teamSize = (members.data?.length ?? 0) + (invitations.data?.length ?? 0);
  const steps: Step[] = [
    {
      title: 'Confirm your email',
      detail: 'So conversation alerts and account notices reach you.',
      done: state.user.emailVerified,
      href: '/settings/account',
      cta: 'Resend link',
    },
    {
      title: 'Add your business details',
      detail: 'Business type and time zone shape reports and business hours.',
      done: Boolean(current.businessType),
      href: '/settings/workspace',
      cta: 'Open settings',
    },
  ];
  if (can('team.manage')) {
    steps.push({
      title: 'Invite your team',
      detail: 'Bring in the people who answer customers.',
      done: teamSize > 1,
      href: '/settings/members',
      cta: 'Invite people',
    });
  }

  const remaining = steps.filter((s) => !s.done).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={
          remaining === 0
            ? `${current.name} is set up. New features appear here as they ship.`
            : `${remaining} ${remaining === 1 ? 'thing' : 'things'} left to set up ${current.name}.`
        }
      />

      <ol className="border-border divide-border bg-surface mt-6 divide-y rounded-[10px] border">
        {steps.map((step) => (
          <li key={step.title} className="flex items-start gap-3 px-4 py-3.5">
            {step.done ? (
              <CircleCheck className="text-success mt-0.5 size-[18px] shrink-0" aria-label="Done" />
            ) : (
              <Circle className="text-input mt-0.5 size-[18px] shrink-0" aria-label="To do" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn('font-medium', step.done && 'text-text-muted line-through')}>
                {step.title}
              </p>
              {!step.done && <p className="text-text-muted text-[13px]">{step.detail}</p>}
            </div>
            {!step.done && (
              <Link
                href={step.href}
                className="text-brand shrink-0 text-[13px] font-medium hover:underline"
              >
                {step.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
