'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/client';
import { unwrap } from '@/lib/api/errors';
import type { components } from '@/lib/api/schema';
import { useWorkspaceKey } from './team';

export type Channel = components['schemas']['ChannelDto'];

export function useChannels() {
  const key = useWorkspaceKey();
  return useQuery({
    queryKey: key('channels'),
    queryFn: async () => unwrap(await api.GET('/api/v1/channels')),
  });
}

/** The snippet a site owner pastes before </body>. */
export function installSnippet(publicKey: string, appOrigin: string): string {
  return `<script src="${appOrigin}/widget.js" data-key="${publicKey}" async></script>`;
}
