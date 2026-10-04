'use client';

import { BookUser, Plus, Search, SearchX } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ContactFormDialog } from '@/components/contacts/contact-form-dialog';
import { STAGE_LABELS, StageLabel, TagChip } from '@/components/contacts/contact-badges';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { formatRelative } from '@/lib/format';
import { type LifecycleStage, useContacts, useTags } from '@/lib/queries/contacts';
import { useDebouncedValue } from '@/lib/use-debounced-value';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

const STAGES = ['VISITOR', 'LEAD', 'CUSTOMER'] as const;

export function ContactsList() {
  const { can } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // Filters live in the URL so a filtered list can be shared and survives reloads.
  const stage = (params.get('stage') as LifecycleStage | null) ?? undefined;
  const tagId = params.get('tag') ?? undefined;
  const [searchInput, setSearchInput] = useState(params.get('q') ?? '');
  const search = useDebouncedValue(searchInput.trim(), 250);

  const setParam = (name: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    router.replace(`${pathname}${next.size ? `?${next}` : ''}`, { scroll: false });
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== search) setParam('q', search || undefined);
    // Only the debounced value should write to the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const contacts = useContacts({ search, stage, tagId });
  const tags = useTags();
  const [creating, setCreating] = useState(false);

  const rows = contacts.data?.pages.flatMap((p) => p.data) ?? [];
  const filtered = Boolean(search || stage || tagId);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Contacts"
        description="Everyone your business talks to, with what you know about them."
        actions={
          can('contact.update') && (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              New contact
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-80">
          <Search
            aria-hidden
            className="text-text-muted pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          />
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Name, email, phone or company"
            aria-label="Search contacts"
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <NativeSelect
          aria-label="Filter by stage"
          value={stage ?? ''}
          onChange={(e) => setParam('stage', e.target.value || undefined)}
          className="h-8 w-36 text-[13px]"
        >
          <option value="">All stages</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Filter by tag"
          value={tagId ?? ''}
          onChange={(e) => setParam('tag', e.target.value || undefined)}
          className="h-8 w-40 text-[13px]"
        >
          <option value="">All tags</option>
          {tags.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.contactCount})
            </option>
          ))}
        </NativeSelect>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput('');
              router.replace(pathname, { scroll: false });
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {contacts.isPending && <ListSkeleton rows={8} />}
      {contacts.isError && (
        <ErrorState error={contacts.error} onRetry={() => void contacts.refetch()} />
      )}

      {contacts.isSuccess && rows.length === 0 && !filtered && (
        <EmptyState
          icon={BookUser}
          title="No contacts yet"
          action={
            can('contact.update') && (
              <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
                Add a contact
              </Button>
            )
          }
        >
          Contacts hold what you know about a customer: how to reach them, their stage, tags and
          your team&apos;s notes. Add one by hand to start.
        </EmptyState>
      )}
      {contacts.isSuccess && rows.length === 0 && filtered && (
        <EmptyState icon={SearchX} title="No contacts match">
          Try a shorter search, or clear the filters.
        </EmptyState>
      )}

      {rows.length > 0 && (
        <div
          className="border-border bg-surface overflow-x-auto rounded-[10px] border"
          aria-busy={contacts.isFetching}
        >
          <table className="w-full min-w-[720px] text-left">
            <thead className="text-text-muted border-border border-b text-[12px]">
              <tr>
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="px-4 py-2.5 font-medium">Company · location</th>
                <th className="px-4 py-2.5 font-medium">Stage</th>
                <th className="px-4 py-2.5 font-medium">Tags</th>
                <th className="px-4 py-2.5 text-right font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-border divide-y text-[13px]">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-canvas group">
                  <td className="max-w-[280px] px-4 py-2">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="focus-visible:ring-ring/50 block rounded outline-none focus-visible:ring-3"
                    >
                      <span className="block truncate text-sm font-medium group-hover:underline">
                        {c.displayName}
                      </span>
                      {c.name && (c.email ?? c.phone) && (
                        <span className="text-text-muted block truncate">{c.email ?? c.phone}</span>
                      )}
                    </Link>
                  </td>
                  <td className="max-w-[200px] px-4 py-2">
                    {c.company ? (
                      <>
                        <span className="block truncate">{c.company}</span>
                        {c.location && (
                          <span className="text-text-muted block truncate">{c.location}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-text-muted block truncate">{c.location ?? '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <StageLabel stage={c.stage} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex max-w-[240px] flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <TagChip key={t.id} name={t.name} color={t.color} />
                      ))}
                    </div>
                  </td>
                  <td className="text-text-muted tabular px-4 py-2 text-right whitespace-nowrap">
                    {c.lastSeenAt ? formatRelative(c.lastSeenAt) : 'Never'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {contacts.hasNextPage && (
        <Button
          variant="outline"
          onClick={() => void contacts.fetchNextPage()}
          disabled={contacts.isFetchingNextPage}
        >
          {contacts.isFetchingNextPage ? 'Loading…' : 'Load more contacts'}
        </Button>
      )}

      {can('contact.update') && (
        <ContactFormDialog
          open={creating}
          onOpenChange={setCreating}
          onSaved={(contact) => router.push(`/contacts/${contact.id}`)}
        />
      )}
    </div>
  );
}
