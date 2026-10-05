'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Check, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/forms/form-alert';
import { FormField } from '@/components/forms/form-field';
import { ConfirmDialog } from '@/components/page/confirm-dialog';
import { PageHeader } from '@/components/page/page-header';
import { ErrorState, ListSkeleton } from '@/components/page/states';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { textOn } from '@/lib/color';
import { type Channel, installSnippet, useChannels } from '@/lib/queries/channels';
import { useWorkspaceKey } from '@/lib/queries/team';
import { useWorkspace } from '@/lib/workspace/workspace-provider';

const HEX = /^#[0-9a-f]{6}$/i;

const schema = z.object({
  name: z.string().trim().min(1, 'Give it a name.').max(60),
  greeting: z.string().trim().max(280, 'Keep it under 280 characters.'),
  accentColor: z.string().regex(HEX, 'Use a hex color like #2563eb.'),
  allowedOrigins: z.string(),
  askForEmail: z.boolean(),
});
type Values = z.infer<typeof schema>;

const toLines = (value: string) =>
  value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter(Boolean);

export function WebsiteChatSettings({ id }: { id: string }) {
  const channels = useChannels();
  const channel = channels.data?.find((c) => c.id === id);

  return (
    <div className="space-y-6">
      <Link
        href="/settings/channels"
        className="text-text-muted hover:text-text inline-flex items-center gap-1 text-[13px]"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        Channels
      </Link>
      {channels.isPending && <ListSkeleton rows={3} />}
      {channels.isError && (
        <ErrorState error={channels.error} onRetry={() => void channels.refetch()} />
      )}
      {channels.isSuccess && !channel && (
        <p className="text-text-muted">That channel does not exist in this workspace.</p>
      )}
      {channel?.type === 'WEBSITE_CHAT' && channel.webChat && channel.publicKey && (
        <ChannelForm channel={channel} />
      )}
    </div>
  );
}

function ChannelForm({ channel }: { channel: Channel }) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const { current } = useWorkspace();
  const settings = channel.webChat!;
  const [confirmOff, setConfirmOff] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    values: {
      name: channel.name,
      greeting: settings.greeting,
      accentColor: settings.accentColor,
      allowedOrigins: settings.allowedOrigins.join('\n'),
      askForEmail: settings.askForEmail,
    },
  });
  const { errors, isDirty } = form.formState;
  const [accent, greeting] = useWatch({ control: form.control, name: ['accentColor', 'greeting'] });

  const save = useMutation({
    mutationFn: async (body: Parameters<typeof patch>[0]) => patch(body),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: key('channels') });
      toast.success(
        saved.status === channel.status
          ? 'Saved. Open chats pick it up on their next page load.'
          : saved.status === 'ACTIVE'
            ? 'Chat is back on.'
            : 'Chat turned off.',
      );
      setConfirmOff(false);
    },
  });

  async function patch(body: {
    name?: string;
    status?: 'ACTIVE' | 'DISCONNECTED';
    greeting?: string;
    accentColor?: string;
    allowedOrigins?: string[];
    askForEmail?: boolean;
  }) {
    return unwrap(
      await api.PATCH('/api/v1/channels/{id}', { params: { path: { id: channel.id } }, body }),
    );
  }

  const off = channel.status !== 'ACTIVE';

  return (
    <>
      <PageHeader
        title={channel.name}
        description={
          off
            ? 'Turned off. The chat button is hidden on your site and visitors cannot start new chats.'
            : 'A chat button on your website. Messages from visitors arrive in the inbox.'
        }
        actions={
          off ? (
            <Button
              variant="outline"
              disabled={save.isPending}
              onClick={() => save.mutate({ status: 'ACTIVE' })}
            >
              Turn on
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmOff(true)}>
              Turn off
            </Button>
          )
        }
      />

      <InstallSection publicKey={channel.publicKey!} />

      <section className="space-y-4">
        <h2 className="text-[15px] font-semibold">Appearance and behavior</h2>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <form
            noValidate
            onSubmit={form.handleSubmit((v) =>
              save.mutate({
                name: v.name,
                greeting: v.greeting,
                accentColor: v.accentColor,
                allowedOrigins: toLines(v.allowedOrigins),
                askForEmail: v.askForEmail,
              }),
            )}
            className="max-w-lg space-y-4"
          >
            {save.error && <FormAlert>{errorMessage(save.error)}</FormAlert>}
            <FormField label="Name" error={errors.name?.message} hint="Only your team sees this.">
              <Input className="h-9" {...form.register('name')} />
            </FormField>
            <FormField
              label="Greeting"
              error={errors.greeting?.message}
              hint="The first message visitors see when they open the chat."
            >
              <Textarea rows={3} {...form.register('greeting')} />
            </FormField>
            <FormField label="Color" error={errors.accentColor?.message}>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label="Pick a color"
                  value={HEX.test(accent) ? accent : '#2563eb'}
                  onChange={(e) =>
                    form.setValue('accentColor', e.target.value, { shouldDirty: true })
                  }
                  className="border-input h-9 w-11 cursor-pointer rounded-md border bg-transparent p-1"
                />
                <Input
                  className="h-9 w-32 font-mono text-[13px]"
                  {...form.register('accentColor')}
                />
              </div>
            </FormField>
            <FormField
              label="Allowed websites"
              error={errors.allowedOrigins?.message}
              hint="One per line, like https://www.yourstore.com. Use https://*.yourstore.com for every subdomain. Leave empty to allow any site."
            >
              <Textarea
                rows={3}
                className="font-mono text-[13px]"
                placeholder="https://www.example.com"
                {...form.register('allowedOrigins')}
              />
            </FormField>
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="accent-brand mt-0.5 size-4"
                {...form.register('askForEmail')}
              />
              <span>
                <span className="font-medium">Ask for name and email first</span>
                <span className="text-text-muted block text-[13px]">
                  Visitors give an email before their first message, so you know who you are talking
                  to.
                </span>
              </span>
            </label>
            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" disabled={!isDirty || save.isPending}>
                {save.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              {isDirty && !save.isPending && (
                <Button type="button" variant="ghost" onClick={() => form.reset()}>
                  Discard
                </Button>
              )}
            </div>
          </form>

          <Preview
            accent={HEX.test(accent) ? accent : settings.accentColor}
            greeting={greeting}
            workspaceName={current?.name ?? ''}
          />
        </div>
      </section>

      <ConfirmDialog
        open={confirmOff}
        onOpenChange={setConfirmOff}
        title="Turn off website chat?"
        impact="The chat button disappears from your site and visitors cannot start new chats. Existing conversations stay in the inbox. You can turn it back on any time."
        confirmLabel="Turn off"
        pending={save.isPending}
        error={save.error}
        onConfirm={() => save.mutate({ status: 'DISCONNECTED' })}
      />
    </>
  );
}

function InstallSection({ publicKey }: { publicKey: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const snippet = installSnippet(publicKey, origin);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the code and copy it by hand.');
    }
  };

  return (
    <section className="border-border bg-surface space-y-3 rounded-[10px] border p-4">
      <div>
        <h2 className="text-[15px] font-semibold">Install on your website</h2>
        <p className="text-text-muted mt-0.5 text-[13px]">
          Paste this just before <code className="font-mono text-[12px]">&lt;/body&gt;</code> on
          every page that should show the chat.
        </p>
      </div>
      <pre className="bg-muted overflow-x-auto rounded-lg px-3 py-2.5 font-mono text-[12px] leading-relaxed">
        {snippet}
      </pre>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Copied' : 'Copy code'}
        </Button>
        <Button size="sm" variant="ghost" asChild>
          <a href={`/widget-preview/${publicKey}`} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
            Try it on a test page
          </a>
        </Button>
      </div>
    </section>
  );
}

function Preview({
  accent,
  greeting,
  workspaceName,
}: {
  accent: string;
  greeting: string;
  workspaceName: string;
}) {
  const text = textOn(accent);
  return (
    <figure className="space-y-2">
      <figcaption className="text-text-muted text-[12px] font-medium">Preview</figcaption>
      <div className="border-border flex h-[220px] flex-col justify-end rounded-[10px] border bg-slate-50 p-3">
        {greeting && (
          <div className="mb-auto space-y-1">
            <span className="text-[11px] font-medium text-slate-500">{workspaceName}</span>
            <p className="max-w-[90%] rounded-[12px] rounded-bl-[4px] border border-slate-200 bg-white px-2.5 py-1.5 text-[12px] leading-snug">
              {greeting}
            </p>
          </div>
        )}
        <p
          className="ml-auto max-w-[80%] rounded-[12px] rounded-br-[4px] px-2.5 py-1.5 text-[12px]"
          style={{ background: accent, color: text }}
        >
          Hi! Is my order on its way?
        </p>
        <span
          className="mt-3 ml-auto flex size-10 items-center justify-center rounded-full shadow-md"
          style={{ background: accent, color: text }}
          aria-hidden
        >
          <MessageCircle className="size-5" />
        </span>
      </div>
    </figure>
  );
}
