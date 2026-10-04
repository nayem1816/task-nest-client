'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { TAG_COLOR_KEYS, TagChip } from '@/components/contacts/contact-badges';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api/client';
import { errorMessage, unwrap } from '@/lib/api/errors';
import { type ContactDetail, useTags } from '@/lib/queries/contacts';
import { useWorkspaceKey } from '@/lib/queries/team';

export function TagPicker({ contact, editable }: { contact: ContactDetail; editable: boolean }) {
  const queryClient = useQueryClient();
  const key = useWorkspaceKey();
  const tags = useTags(editable);
  const [newName, setNewName] = useState('');
  const selected = new Set(contact.tags.map((t) => t.id));

  const setTags = useMutation({
    mutationFn: async (tagIds: string[]) =>
      unwrap(
        await api.PUT('/api/v1/contacts/{id}/tags', {
          params: { path: { id: contact.id } },
          body: { tagIds },
        }),
      ),
    onSuccess: (updated) => {
      queryClient.setQueryData(key('contacts', 'detail', contact.id), updated);
      void queryClient.invalidateQueries({ queryKey: key('contacts', 'activity', contact.id) });
      void queryClient.invalidateQueries({ queryKey: key('contacts', 'list') });
      void queryClient.invalidateQueries({ queryKey: key('tags') });
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const createTag = useMutation({
    mutationFn: async (name: string) => {
      // Cycle through the palette so new tags are told apart without picking colours.
      const color = TAG_COLOR_KEYS[(tags.data?.length ?? 0) % TAG_COLOR_KEYS.length];
      return unwrap(await api.POST('/api/v1/tags', { body: { name, color } }));
    },
    onSuccess: (tag) => {
      setNewName('');
      setTags.mutate([...selected, tag.id]);
    },
    onError: (error) => toast.error(errorMessage(error)),
  });

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setTags.mutate([...next]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {contact.tags.map((t) => (
        <TagChip key={t.id} name={t.name} color={t.color} />
      ))}
      {contact.tags.length === 0 && !editable && (
        <span className="text-text-muted text-[13px]">No tags</span>
      )}
      {editable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="xs"
              className="text-text-muted"
              aria-label={contact.tags.length ? 'Edit tags' : 'Add tag'}
            >
              <Plus aria-hidden />
              {contact.tags.length ? 'Edit' : 'Add tag'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuLabel className="text-text-muted text-[12px] font-normal">
              Tags
            </DropdownMenuLabel>
            {tags.data?.map((t) => (
              <DropdownMenuCheckboxItem
                key={t.id}
                checked={selected.has(t.id)}
                onCheckedChange={() => toggle(t.id)}
                onSelect={(e) => e.preventDefault()}
                disabled={setTags.isPending}
              >
                <TagChip name={t.name} color={t.color} />
                <span className="text-text-muted tabular ml-auto text-[12px]">
                  {t.contactCount}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <form
              className="flex gap-1.5 p-1"
              onSubmit={(e) => {
                e.preventDefault();
                const name = newName.trim();
                if (name) createTag.mutate(name);
              }}
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                // Keep typing from triggering the menu's type-ahead.
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="New tag"
                aria-label="New tag name"
                maxLength={40}
                className="h-7 text-[13px]"
              />
              <Button type="submit" size="sm" disabled={!newName.trim() || createTag.isPending}>
                Add
              </Button>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
