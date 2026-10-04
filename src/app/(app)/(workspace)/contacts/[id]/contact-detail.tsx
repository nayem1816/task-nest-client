'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MoreHorizontal, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { StageLabel } from '@/components/contacts/contact-badges';
import { ContactFormDialog } from '@/components/contacts/contact-form-dialog';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { ErrorState } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api/client';
import { ApiError, unwrap } from '@/lib/api/errors';
import { formatDate, formatDateTime, formatRelative } from '@/lib/format';
import { type ContactDetail, useContact, useContactActivity } from '@/lib/queries/contacts';
import { useWorkspaceKey } from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';
import { ContactNotes } from './contact-notes';
import { describeActivity } from './describe-activity';
import { TagPicker } from './tag-picker';

const CHANNEL_LABELS: Record<string, string> = {
  EMAIL: 'Email',
  PHONE: 'Phone',
  WEBSITE_CHAT: 'Website chat',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  MESSENGER: 'Messenger',
  INSTAGRAM: 'Instagram',
};

export function ContactDetailView({ id }: { id: string }) {
  const contact = useContact(id);
  const { current, can } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (contact.isPending) return <DetailSkeleton />;
  if (contact.isError) {
    const missing = contact.error instanceof ApiError && contact.error.status === 404;
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <BackLink />
        <div className="mt-6">
          {missing ? (
            <p className="text-text-muted">
              This contact doesn&apos;t exist in {current?.name ?? 'this workspace'}. It may have
              been deleted.
            </p>
          ) : (
            <ErrorState error={contact.error} onRetry={() => void contact.refetch()} />
          )}
        </div>
      </div>
    );
  }

  const c = contact.data;
  const canEdit = can('contact.update');

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <BackLink />

      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[22px] font-semibold tracking-tight">{c.displayName}</h1>
          <p className="text-text-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            <StageLabel stage={c.stage} />
            {c.company && <span>{c.company}</span>}
            {c.location && <span>{c.location}</span>}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              Edit
            </Button>
            {can('contact.delete') && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="More actions">
                    <MoreHorizontal aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
                    Delete contact
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </header>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="order-2 space-y-8 lg:order-1">
          {current && (
            <ContactNotes
              contactId={c.id}
              canWrite={canEdit}
              canDeleteAny={can('contact.delete')}
              memberId={current.memberId}
            />
          )}
          <Timeline contactId={c.id} />
        </div>

        <aside className="order-1 space-y-6 lg:order-2" aria-label="Contact details">
          <Details contact={c} />
          <section aria-labelledby="tags-heading" className="space-y-2">
            <h2 id="tags-heading" className="text-text-muted text-[12px] font-medium">
              Tags
            </h2>
            <TagPicker contact={c} editable={canEdit} />
          </section>
        </aside>
      </div>

      {canEdit && <ContactFormDialog open={editing} onOpenChange={setEditing} contact={c} />}
      <DeleteContact contact={c} open={deleting} onOpenChange={setDeleting} />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/contacts"
      className="text-text-muted hover:text-text inline-flex items-center gap-1 text-[13px]"
    >
      <ArrowLeft className="size-3.5" aria-hidden />
      Contacts
    </Link>
  );
}

function Details({ contact }: { contact: ContactDetail }) {
  const rows: [string, React.ReactNode][] = [
    [
      'Email',
      contact.email ? (
        <a href={`mailto:${contact.email}`} className="hover:underline">
          {contact.email}
        </a>
      ) : null,
    ],
    ['Phone', contact.phone],
    ['Company', contact.company],
    ['Location', contact.location],
    ['Last seen', contact.lastSeenAt ? formatRelative(contact.lastSeenAt) : 'Never'],
    ['Added', formatDate(contact.createdAt)],
  ];
  const otherChannels = contact.identities.filter((i) => !['EMAIL', 'PHONE'].includes(i.channel));

  return (
    <dl className="border-border bg-surface divide-border divide-y rounded-[10px] border text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3 px-3.5 py-2">
          <dt className="text-text-muted w-20 shrink-0">{label}</dt>
          <dd className="min-w-0 truncate">
            {value ?? <span className="text-text-muted">—</span>}
          </dd>
        </div>
      ))}
      {otherChannels.map((identity) => (
        <div key={`${identity.channel}:${identity.externalId}`} className="flex gap-3 px-3.5 py-2">
          <dt className="text-text-muted w-20 shrink-0">
            {CHANNEL_LABELS[identity.channel] ?? identity.channel}
          </dt>
          <dd className="min-w-0 truncate font-mono text-[12px]">{identity.externalId}</dd>
        </div>
      ))}
    </dl>
  );
}

function Timeline({ contactId }: { contactId: string }) {
  const activity = useContactActivity(contactId);
  const entries = activity.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <section aria-labelledby="activity-heading" className="space-y-3">
      <h2 id="activity-heading" className="text-base font-semibold">
        Activity
      </h2>
      {activity.isError && (
        <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
      )}
      <ol className="border-border relative ml-1.5 space-y-3 border-l pl-4">
        {entries.map((entry) => (
          <li key={entry.id} className="relative">
            <span
              aria-hidden
              className="bg-surface border-input absolute top-1.5 -left-[21px] size-2 rounded-full border"
            />
            <p className="text-[13px]">{describeActivity(entry)}</p>
            {entry.type === 'note.added' && typeof entry.metadata?.excerpt === 'string' && (
              <p className="text-text-muted truncate text-[12px]">“{entry.metadata.excerpt}”</p>
            )}
            <time
              dateTime={entry.createdAt}
              title={formatDateTime(entry.createdAt)}
              className="text-text-muted tabular text-[12px]"
            >
              {formatRelative(entry.createdAt)}
            </time>
          </li>
        ))}
      </ol>
      {activity.hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => void activity.fetchNextPage()}
          disabled={activity.isFetchingNextPage}
        >
          Show earlier activity
        </Button>
      )}
    </section>
  );
}

function DeleteContact({
  contact,
  open,
  onOpenChange,
}: {
  contact: ContactDetail;
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const remove = useMutation({
    mutationFn: async () =>
      unwrap(await api.DELETE('/api/v1/contacts/{id}', { params: { path: { id: contact.id } } })),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key('contacts', 'list') });
      queryClient.removeQueries({ queryKey: key('contacts', 'detail', contact.id) });
      toast.success(`${contact.displayName} deleted.`);
      router.replace('/contacts');
    },
  });

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) remove.reset();
        onOpenChange(next);
      }}
      title={`Delete ${contact.displayName}?`}
      impact={`Their details, tags, ${contact.noteCount} ${contact.noteCount === 1 ? 'note' : 'notes'} and history are removed for everyone. This can't be undone.`}
      confirmLabel="Delete contact"
      pending={remove.isPending}
      error={remove.error}
      onConfirm={() => remove.mutate()}
    />
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6 sm:px-6 lg:px-8" aria-hidden>
      <div className="bg-muted h-3 w-20 animate-pulse rounded" />
      <div className="bg-muted h-6 w-56 animate-pulse rounded" />
      <div className="bg-muted mt-6 h-48 animate-pulse rounded-[10px]" />
    </div>
  );
}
