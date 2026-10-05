'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Globe, PenLine, Upload } from 'lucide-react';
import { useId, useState } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/forms/form-alert';
import { SubmitButton } from '@/components/forms/submit-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { useWorkspaceKey } from '@/lib/queries/team';
import { cn } from '@/lib/utils';

type Kind = 'text' | 'url' | 'file';

const KINDS: { id: Kind; label: string; icon: typeof PenLine }[] = [
  { id: 'text', label: 'Write', icon: PenLine },
  { id: 'url', label: 'Web page', icon: Globe },
  { id: 'file', label: 'File', icon: FileText },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.html,.htm';

interface AddSourceDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** Opens the new source so its progress is visible. */
  onAdded(id: string): void;
}

export function AddSourceDialog({ open, onOpenChange, onAdded }: AddSourceDialogProps) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const ids = useId();
  const [kind, setKind] = useState<Kind>('text');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const reset = () => {
    setTitle('');
    setContent('');
    setUrl('');
    setFile(null);
    setProblem(null);
  };

  const add = useMutation({
    mutationFn: async () => {
      if (kind === 'text') {
        return unwrap(
          await api.POST('/api/v1/knowledge/sources/text', { body: { title, content } }),
        );
      }
      if (kind === 'url') {
        return unwrap(
          await api.POST('/api/v1/knowledge/sources/url', {
            body: { url: url.trim(), title: title.trim() || undefined },
          }),
        );
      }
      const form = new FormData();
      form.append('file', file!);
      if (title.trim()) form.append('title', title.trim());
      return unwrap(
        await api.POST('/api/v1/knowledge/sources/file', {
          body: {} as never,
          bodySerializer: () => form,
        }),
      );
    },
    onSuccess: async (source) => {
      await queryClient.invalidateQueries({ queryKey: key('knowledge') });
      toast.success(`${source.title} added. Reading it now.`);
      reset();
      onOpenChange(false);
      onAdded(source.id);
    },
  });

  const submit = () => {
    setProblem(null);
    if (kind === 'text' && (!title.trim() || !content.trim())) {
      return setProblem('Give it a title and some text.');
    }
    if (kind === 'url' && !/^https?:\/\/\S+\.\S+/.test(url.trim())) {
      return setProblem('Enter the full address, starting with https://');
    }
    if (kind === 'file') {
      if (!file) return setProblem('Choose a file.');
      if (file.size > MAX_FILE_BYTES) return setProblem('That file is larger than 10 MB.');
    }
    add.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) add.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a source</DialogTitle>
          <DialogDescription>
            The AI reads it, splits it into passages and answers from them.
          </DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="Source type" className="bg-muted flex rounded-lg p-0.5">
          {KINDS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => {
                setKind(id);
                setProblem(null);
              }}
              className={cn(
                'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md text-[13px] font-medium',
                kind === id ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="space-y-4"
        >
          {(problem ?? add.error) && <FormAlert>{problem ?? errorMessage(add.error)}</FormAlert>}

          {kind === 'url' && (
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-url`}>Page address</Label>
              <Input
                id={`${ids}-url`}
                type="url"
                inputMode="url"
                placeholder="https://www.yourstore.com/shipping"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-9"
                autoFocus
              />
              <p className="text-text-muted text-[13px]">
                A public page. Use &ldquo;Index again&rdquo; later to pick up changes.
              </p>
            </div>
          )}

          {kind === 'file' && (
            <label
              htmlFor={`${ids}-file`}
              className="border-border hover:bg-muted/50 flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center"
            >
              <Upload className="text-text-muted size-5" aria-hidden />
              <span className="font-medium">{file ? file.name : 'Choose a file'}</span>
              <span className="text-text-muted text-[12px]">
                PDF, Word, text, Markdown or HTML, up to 10 MB
              </span>
              <input
                id={`${ids}-file`}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          <div className="space-y-1.5">
            <Label htmlFor={`${ids}-title`}>
              Title
              {kind !== 'text' && <span className="text-text-muted font-normal"> (optional)</span>}
            </Label>
            <Input
              id={`${ids}-title`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'text' ? 'Shipping policy' : 'Taken from the page or file name'}
              maxLength={160}
              className="h-9"
              autoFocus={kind === 'text'}
            />
          </div>

          {kind === 'text' && (
            <div className="space-y-1.5">
              <Label htmlFor={`${ids}-content`}>Text</Label>
              <Textarea
                id={`${ids}-content`}
                rows={9}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={'# Shipping\nOrders leave within 2 business days…'}
                className="font-mono text-[13px]"
              />
              <p className="text-text-muted text-[13px]">
                Lines starting with # become headings, which help the AI find the right part.
              </p>
            </div>
          )}

          <SubmitButton pending={add.isPending} pendingLabel="Adding">
            Add source
          </SubmitButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
