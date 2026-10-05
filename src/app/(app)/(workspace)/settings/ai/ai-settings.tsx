'use client';

import { useMutation } from '@tanstack/react-query';
import { CircleCheck, CircleSlash, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { lastDays } from '@/lib/format';
import {
  AI_FEATURE_LABELS,
  type AiStatus,
  type AiUsage,
  useAiStatus,
  useAiUsage,
} from '@/lib/queries/ai';
import { cn } from '@/lib/utils';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

const DAYS = 30;
const numbers = new Intl.NumberFormat('en');
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

export function AiSettings() {
  const status = useAiStatus();
  const usage = useAiUsage(DAYS);

  return (
    <div className="space-y-8">
      <PageHeader
        title="AI"
        description="The model behind AI replies, knowledge search and the playground."
      />
      {status.isPending && <ListSkeleton rows={1} />}
      {status.isError && <ErrorState error={status.error} onRetry={() => void status.refetch()} />}
      {status.data && <StatusCard status={status.data} />}

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold">Usage, last {DAYS} days</h2>
        {usage.isPending && <ListSkeleton rows={2} />}
        {usage.isError && <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />}
        {usage.data && <UsageReport usage={usage.data} />}
      </section>
    </div>
  );
}

function StatusCard({ status }: { status: AiStatus }) {
  const { can } = useWorkspace();
  const check = useMutation({
    mutationFn: async () => unwrap(await api.POST('/api/v1/ai/check')),
  });

  return (
    <section className="border-border bg-surface rounded-[10px] border p-4">
      <div className="flex flex-wrap items-start gap-3">
        {status.configured ? (
          <CircleCheck className="mt-0.5 size-5 text-green-600" aria-hidden />
        ) : (
          <CircleSlash className="text-text-muted mt-0.5 size-5" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {status.configured ? `Connected to ${providerName(status.provider)}` : 'Not set up'}
          </p>
          {status.configured ? (
            <dl className="text-text-muted mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-[13px]">
              <dt>Replies</dt>
              <dd className="text-text font-mono text-[12px]">{status.chatModel}</dd>
              <dt>Search</dt>
              <dd className="text-text font-mono text-[12px]">{status.embeddingModel}</dd>
            </dl>
          ) : (
            <p className="text-text-muted mt-1 max-w-xl text-[13px]">
              This server has no AI provider key, so AI replies and knowledge search are off.
              Whoever runs the server sets{' '}
              <code className="font-mono text-[12px]">GEMINI_API_KEY</code> and restarts it.
              Everything else in TaskNest works without it.
            </p>
          )}
        </div>
        {status.configured && can('agent.manage') && (
          <Button
            variant="outline"
            size="sm"
            disabled={check.isPending}
            onClick={() => check.mutate()}
          >
            {check.isPending ? 'Checking…' : 'Test connection'}
          </Button>
        )}
      </div>
      {check.isSuccess && (
        <p className="border-border mt-3 border-t pt-3 text-[13px]" role="status">
          The model answered in {(check.data.latencyMs / 1000).toFixed(1)}s.
        </p>
      )}
      {check.isError && (
        <p className="text-danger border-border mt-3 border-t pt-3 text-[13px]" role="alert">
          {errorMessage(check.error)}
        </p>
      )}
    </section>
  );
}

function UsageReport({ usage }: { usage: AiUsage }) {
  const { current } = useWorkspace();
  if (usage.totals.requests === 0) {
    return (
      <EmptyState icon={Sparkles} title="No AI requests yet">
        Requests show up here once the AI starts answering customers or indexing your knowledge
        base.
      </EmptyState>
    );
  }

  const peak = Math.max(...usage.byDay.map((d) => d.requests), 1);
  const requestsOn = new Map(usage.byDay.map((d) => [d.date, d.requests]));
  const days = lastDays(usage.days, current?.timezone ?? 'UTC');
  return (
    <div className="space-y-5">
      <dl className="border-border bg-surface [&>div]:border-border grid grid-cols-2 divide-x divide-y rounded-[10px] border sm:grid-cols-4 sm:divide-y-0">
        <Stat label="Requests" value={numbers.format(usage.totals.requests)} />
        <Stat
          label="Failed"
          value={numbers.format(usage.totals.failed)}
          tone={usage.totals.failed > 0 ? 'warn' : undefined}
        />
        <Stat label="Tokens in" value={compact.format(usage.totals.inputTokens)} />
        <Stat label="Tokens out" value={compact.format(usage.totals.outputTokens)} />
      </dl>

      <figure className="space-y-2">
        <figcaption className="text-text-muted text-[12px] font-medium">
          Requests per day
        </figcaption>
        <div className="flex h-20 items-end gap-1" role="img" aria-label="Requests per day">
          {days.map((date) => {
            const requests = requestsOn.get(date) ?? 0;
            return (
              <div
                key={date}
                title={`${date}: ${requests} request${requests === 1 ? '' : 's'}`}
                className={cn(
                  'flex-1 rounded-t-sm',
                  requests > 0 ? 'bg-brand/70 hover:bg-brand' : 'bg-muted',
                )}
                style={{
                  height: requests > 0 ? `${Math.max((requests / peak) * 100, 6)}%` : '2px',
                }}
              />
            );
          })}
        </div>
      </figure>

      <table className="w-full text-[13px]">
        <thead className="text-text-muted text-left text-[12px]">
          <tr className="border-border border-b">
            <th className="py-2 font-medium">Used for</th>
            <th className="py-2 text-right font-medium">Requests</th>
            <th className="py-2 text-right font-medium">Failed</th>
            <th className="hidden py-2 text-right font-medium sm:table-cell">Tokens in</th>
            <th className="hidden py-2 text-right font-medium sm:table-cell">Tokens out</th>
          </tr>
        </thead>
        <tbody>
          {usage.byFeature.map((f) => (
            <tr key={f.feature} className="border-border border-b last:border-0">
              <td className="py-2">{AI_FEATURE_LABELS[f.feature] ?? f.feature}</td>
              <td className="py-2 text-right tabular-nums">{numbers.format(f.requests)}</td>
              <td className={cn('py-2 text-right tabular-nums', f.failed > 0 && 'text-warning')}>
                {numbers.format(f.failed)}
              </td>
              <td className="hidden py-2 text-right tabular-nums sm:table-cell">
                {numbers.format(f.inputTokens)}
              </td>
              <td className="hidden py-2 text-right tabular-nums sm:table-cell">
                {numbers.format(f.outputTokens)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div className="px-4 py-3">
      <dt className="text-text-muted text-[12px]">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'warn' && 'text-warning',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function providerName(provider: string | null): string {
  return provider === 'gemini' ? 'Google Gemini' : (provider ?? 'the AI provider');
}
