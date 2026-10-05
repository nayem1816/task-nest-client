'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { reportSessionLost } from '@/lib/api/client';
import { refreshSession } from '@/lib/auth/refresh';
import { getAccessToken, onAccessTokenChange } from '@/lib/auth/token-store';
import { useWorkspace, WORKSPACES_QUERY_KEY } from '@/lib/workspace/workspace-provider';
import { REALTIME_URL } from './realtime-url';
import { type TypingEvent, TypingStore } from './typing-store';

const TYPING_SEND_INTERVAL_MS = 2_500;
// A refresh that succeeds but is still refused points at a bug, not an expired
// token; stop instead of looping.
const MAX_AUTH_RETRIES = 2;

/**
 * live: events are arriving. reconnecting: the connection dropped and is being
 * retried. paused: the server refused it for good (e.g. access removed).
 * Anything but live means lists fall back to polling.
 */
export type RealtimeStatus = 'connecting' | 'live' | 'reconnecting' | 'paused';

interface ServerEvents {
  'message.created': (e: { conversationId: string; sender: string; internal: boolean }) => void;
  'conversation.updated': (e: { conversationId: string; changes: string[] }) => void;
  typing: (e: TypingEvent) => void;
}

interface ClientEvents {
  'auth.renew': (payload: { token: string }, ack: (result: { ok: boolean }) => void) => void;
  typing: (payload: { conversationId: string }) => void;
}

type RealtimeSocket = Socket<ServerEvents, ClientEvents>;

interface RealtimeContextValue {
  status: RealtimeStatus;
  sendTyping(conversationId: string): void;
  typing: TypingStore;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { current } = useWorkspace();
  if (!current) return children;
  // A new workspace is a new connection with fresh state.
  return (
    <RealtimeConnection key={current.id} workspaceId={current.id} memberId={current.memberId}>
      {children}
    </RealtimeConnection>
  );
}

function RealtimeConnection({
  workspaceId,
  memberId,
  children,
}: {
  workspaceId: string;
  memberId: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>('connecting');
  const [typing] = useState(() => new TypingStore());
  const socketRef = useRef<RealtimeSocket | null>(null);
  const lastTyping = useRef({ conversationId: '', at: 0 });

  useEffect(() => {
    let disposed = false;
    let everConnected = false;
    let authRetries = 0;

    const socket: RealtimeSocket = io(REALTIME_URL, {
      auth: (send) => send({ token: getAccessToken(), organizationId: workspaceId }),
      transports: ['websocket'],
    });
    socketRef.current = socket;

    const invalidate = (...parts: string[]) =>
      void queryClient.invalidateQueries({ queryKey: [workspaceId, 'inbox', ...parts] });

    const reconnect = async (refreshFirst: boolean) => {
      if (refreshFirst) {
        if (++authRetries > MAX_AUTH_RETRIES) return setStatus('paused');
        const session = await refreshSession().catch(() => undefined);
        if (disposed) return;
        if (session === null) return reportSessionLost();
        // Refresh failed on the network: try again in a moment.
        if (session === undefined) {
          setTimeout(() => !disposed && socket.connect(), 5_000);
          return;
        }
      }
      if (!disposed) socket.connect();
    };

    socket.on('connect', () => {
      authRetries = 0;
      setStatus('live');
      // Whatever happened while disconnected was missed; catch up once.
      if (everConnected) invalidate();
      everConnected = true;
    });

    socket.on('disconnect', (reason) => {
      if (disposed) return;
      setStatus('reconnecting');
      typing.reset();
      // The server closed it on purpose (token ran out, session revoked, role
      // changed). Socket.IO does not retry those, so reconnect and let the
      // handshake decide.
      if (reason === 'io server disconnect') void reconnect(false);
    });

    socket.on('connect_error', (err) => {
      const code = (err as Error & { data?: { code?: string } }).data?.code;
      if (code === 'UNAUTHENTICATED' || code === 'SESSION_EXPIRED') {
        void reconnect(true);
      } else if (code) {
        // Membership changed under us; the workspace list will catch up.
        setStatus('paused');
        void queryClient.invalidateQueries({ queryKey: WORKSPACES_QUERY_KEY });
      } else {
        // Network trouble: Socket.IO keeps retrying with backoff on its own.
        setStatus('reconnecting');
      }
    });

    socket.on('message.created', (e) => {
      if (e.sender === 'MEMBER') typing.clearConversation(e.conversationId);
      invalidate('messages', e.conversationId);
      invalidate('conversation', e.conversationId);
      invalidate('list');
      invalidate('counts');
    });

    socket.on('conversation.updated', (e) => {
      invalidate('conversation', e.conversationId);
      invalidate('list');
      invalidate('counts');
    });

    socket.on('typing', (e) => {
      // The same person in another tab is not news.
      if (e.memberId !== memberId) typing.add(e);
    });

    const stopRenewing = onAccessTokenChange((token) => {
      if (token && socket.connected) socket.emit('auth.renew', { token }, () => {});
    });

    return () => {
      disposed = true;
      stopRenewing();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      typing.reset();
    };
  }, [workspaceId, memberId, queryClient, typing]);

  const sendTyping = useCallback((conversationId: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    const now = Date.now();
    const last = lastTyping.current;
    if (last.conversationId === conversationId && now - last.at < TYPING_SEND_INTERVAL_MS) return;
    lastTyping.current = { conversationId, at: now };
    socket.emit('typing', { conversationId });
  }, []);

  return (
    <RealtimeContext.Provider value={{ status, sendTyping, typing }}>
      {children}
    </RealtimeContext.Provider>
  );
}

/** Null outside a workspace (and in tests), which reads as "not live". */
export function useRealtime(): RealtimeContextValue | null {
  return useContext(RealtimeContext);
}

/** Lists use this to stop polling while events are arriving. */
export function useLiveUpdates(): boolean {
  return useRealtime()?.status === 'live';
}

const NO_TYPING = new TypingStore();

/** Names of teammates typing in this conversation right now. */
export function useTypingNames(conversationId: string): string[] {
  const store = useRealtime()?.typing ?? NO_TYPING;
  const snapshot = useSyncExternalStore(
    store.subscribe,
    () => store.snapshot(conversationId),
    () => '',
  );
  return snapshot ? snapshot.split('\n') : [];
}
