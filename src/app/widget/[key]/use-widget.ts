'use client';

import createClient from 'openapi-fetch';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { components, paths } from '@/lib/api/schema';
import { REALTIME_URL } from '@/lib/realtime/realtime-url';

export type WidgetConfig = components['schemas']['WidgetConfigDto'];
export type WidgetVisitor = components['schemas']['WidgetVisitorDto'];
export type WidgetMessage = components['schemas']['WidgetMessageDto'] & {
  /** Set on a message the visitor just sent until the API confirms it. */
  pending?: boolean;
  failed?: boolean;
};

// No member session here: a plain client, without the app's token handling.
const widgetApi = createClient<paths>({
  baseUrl: typeof window === 'undefined' ? '' : window.location.origin,
});

type Phase =
  | { name: 'loading' }
  | { name: 'unavailable'; message: string }
  | { name: 'ready'; config: WidgetConfig; visitor: WidgetVisitor };

const authorized = (token: string | null) => ({
  headers: { Authorization: `Bearer ${token ?? ''}` },
});

const storageKey = (publicKey: string) => `tasknest.widget.${publicKey}`;

function readToken(publicKey: string): string | undefined {
  try {
    return localStorage.getItem(storageKey(publicKey)) ?? undefined;
  } catch {
    return undefined; // Storage blocked (private mode, strict third-party settings).
  }
}

function saveToken(publicKey: string, token: string) {
  try {
    localStorage.setItem(storageKey(publicKey), token);
  } catch {
    // Without storage the chat still works; it just starts fresh next visit.
  }
}

/**
 * Session, history, sending and the live connection for one visitor. The
 * token is kept per site (browsers partition iframe storage by the top-level
 * site), so a visitor on two shops using TaskNest is two separate visitors.
 */
export function useWidget(publicKey: string, pageOrigin: string | null) {
  const [phase, setPhase] = useState<Phase>({ name: 'loading' });
  const [messages, setMessages] = useState<WidgetMessage[]>([]);
  const token = useRef<string | null>(null);
  const [connection, setConnection] = useState(0);

  const startSession = useCallback(async () => {
    const { data, error } = await widgetApi.POST('/api/v1/widget/session', {
      body: {
        key: publicKey,
        visitorToken: token.current ?? readToken(publicKey),
        pageOrigin: pageOrigin ?? undefined,
      },
    });
    if (!data) {
      const message =
        (error as { error?: { message?: string } } | undefined)?.error?.message ??
        'This chat is not available right now.';
      setPhase({ name: 'unavailable', message });
      return false;
    }
    token.current = data.visitorToken;
    saveToken(publicKey, data.visitorToken);
    setPhase({ name: 'ready', config: data.config, visitor: data.visitor });
    setConnection((n) => n + 1);
    return true;
  }, [publicKey, pageOrigin]);

  const loadHistory = useCallback(async () => {
    if (!token.current) return;
    const { data, response } = await widgetApi.GET(
      '/api/v1/widget/messages',
      authorized(token.current),
    );
    if (data) {
      // Keep messages still on their way (or failed) at the end.
      setMessages((current) => [...data, ...current.filter((m) => m.pending || m.failed)]);
    } else if (response.status === 401) {
      await startSession();
    }
  }, [startSession]);

  useEffect(() => {
    let cancelled = false;
    void startSession().then((ok) => {
      if (ok && !cancelled) void loadHistory();
    });
    return () => {
      cancelled = true;
    };
  }, [startSession, loadHistory]);

  // A new token (first load, or a restarted session) means a new connection.
  useEffect(() => {
    if (connection === 0 || !token.current) return;
    let everConnected = false;
    const socket = io(`${REALTIME_URL}/widget`, {
      auth: { visitorToken: token.current },
      transports: ['websocket'],
    });
    socket.on('message.created', () => void loadHistory());
    socket.on('connect', () => {
      // Replies that arrived while offline.
      if (everConnected) void loadHistory();
      everConnected = true;
    });
    socket.on('connect_error', (err: Error & { data?: { code?: string } }) => {
      if (err.data?.code === 'UNAUTHENTICATED') void startSession();
    });
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [connection, loadHistory, startSession]);

  const send = useCallback(
    async (body: string, about?: { name?: string; email?: string }) => {
      const localId = `local-${Date.now()}`;
      const draft: WidgetMessage = {
        id: localId,
        from: 'visitor',
        authorName: null,
        body,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((current) => [...current.filter((m) => m.id !== localId), draft]);

      const { data } = await widgetApi.POST('/api/v1/widget/messages', {
        ...authorized(token.current),
        body: { body, ...about },
      });
      setMessages((current) => {
        if (!data) {
          return current.map((m) =>
            m.id === localId ? { ...m, pending: false, failed: true } : m,
          );
        }
        // The live update may have brought the saved copy in already.
        return current.some((m) => m.id === data.id)
          ? current.filter((m) => m.id !== localId)
          : current.map((m) => (m.id === localId ? data : m));
      });
      if (data && about && phase.name === 'ready') {
        setPhase({
          ...phase,
          visitor: {
            name: phase.visitor.name ?? about.name ?? null,
            email: phase.visitor.email ?? about.email ?? null,
          },
        });
      }
      return Boolean(data);
    },
    [phase],
  );

  const retry = useCallback(
    (message: WidgetMessage) => {
      setMessages((current) => current.filter((m) => m.id !== message.id));
      return send(message.body);
    },
    [send],
  );

  return { phase, messages, send, retry };
}
