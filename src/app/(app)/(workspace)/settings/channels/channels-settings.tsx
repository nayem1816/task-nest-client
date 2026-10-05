'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, MessagesSquare, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { SubmitButton } from '@/components/forms/submit-button';
import { ChannelIcon } from '@/components/inbox/inbox-badges';
import { PageHeader } from '@/components/page/page-header';
import { EmptyState, ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { type Channel, useChannels } from '@/lib/queries/channels';
import { useWorkspaceKey } from '@/lib/queries/team';

const TYPE_LABELS: Record<Channel['type'], string> = {
  WEBSITE_CHAT: 'Website chat',
  EMAIL: 'Email',
  PHONE: 'Phone',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  MESSENGER: 'Messenger',
  INSTAGRAM: 'Instagram',
};

/** What each channel type can actually do today, said plainly. */
const NOT_CONNECTED_YET: Partial<Record<Channel['type'], string>> = {
  EMAIL:
    'Sending and receiving email is not connected yet. Conversations here are kept for reference.',
};

export function ChannelsSettings() {
  const channels = useChannels();
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Channels"
        description="Where customers reach you. Every conversation lands in the same inbox."
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden />
            Add website chat
          </Button>
        }
      />

      {channels.isPending && <ListSkeleton rows={2} />}
      {channels.isError && (
        <ErrorState error={channels.error} onRetry={() => void channels.refetch()} />
      )}
      {channels.data?.length === 0 && (
        <EmptyState icon={MessagesSquare} title="No channels yet">
          Add website chat to start talking to visitors on your site.
        </EmptyState>
      )}

      {channels.data && channels.data.length > 0 && (
        <ul className="border-border bg-surface divide-border divide-y rounded-[10px] border">
          {channels.data.map((channel) => (
            <ChannelRow key={channel.id} channel={channel} />
          ))}
        </ul>
      )}

      <AddWebsiteChatDialog open={adding} onOpenChange={setAdding} />
    </div>
  );
}

function ChannelRow({ channel }: { channel: Channel }) {
  const off = channel.status !== 'ACTIVE';
  const note = NOT_CONNECTED_YET[channel.type];
  const body = (
    <>
      <span className="bg-muted text-text-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
        <ChannelIcon type={channel.type} className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="font-medium">{channel.name}</span>
          {channel.name !== TYPE_LABELS[channel.type] && (
            <span className="text-text-muted text-[12px]">{TYPE_LABELS[channel.type]}</span>
          )}
          {off && (
            <span className="inline-flex h-5 items-center rounded-md bg-slate-100 px-1.5 text-[12px] font-medium text-slate-600">
              Turned off
            </span>
          )}
        </div>
        <p className="text-text-muted mt-0.5 text-[13px]">
          {note ??
            `${channel.openConversations} open conversation${channel.openConversations === 1 ? '' : 's'}`}
        </p>
      </div>
    </>
  );

  if (channel.type !== 'WEBSITE_CHAT') {
    return <li className="flex items-center gap-3 px-4 py-3">{body}</li>;
  }
  return (
    <li>
      <Link
        href={`/settings/channels/${channel.id}`}
        className="hover:bg-muted/60 flex items-center gap-3 px-4 py-3 transition-colors"
      >
        {body}
        <span className="text-text-muted hidden text-[13px] sm:inline">Settings and install</span>
        <ChevronRight className="text-text-muted size-4" aria-hidden />
      </Link>
    </li>
  );
}

const schema = z.object({ name: z.string().trim().min(1, 'Give it a name.').max(60) });
type Values = z.infer<typeof schema>;

function AddWebsiteChatDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const form = useForm<Values>({ resolver: zodResolver(schema), values: { name: 'Website chat' } });

  const create = useMutation({
    mutationFn: async (body: Values) =>
      unwrap(await api.POST('/api/v1/channels/website', { body })),
    onSuccess: async (channel) => {
      await queryClient.invalidateQueries({ queryKey: key('channels') });
      toast.success(`${channel.name} added. Install it on your site next.`);
      onOpenChange(false);
      router.push(`/settings/channels/${channel.id}`);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) create.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add website chat</DialogTitle>
          <DialogDescription>
            A chat button for your website. One per site works best, so you can tell them apart in
            the inbox.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={form.handleSubmit((values) => create.mutate(values))}
          className="space-y-4"
        >
          {create.error && <FormAlert>{errorMessage(create.error)}</FormAlert>}
          <FormField
            label="Name"
            error={form.formState.errors.name?.message}
            hint="Only your team sees this, e.g. “Main store” or “Wholesale site”."
          >
            <Input autoFocus className="h-9" {...form.register('name')} />
          </FormField>
          <SubmitButton pending={create.isPending} pendingLabel="Adding">
            Add website chat
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
