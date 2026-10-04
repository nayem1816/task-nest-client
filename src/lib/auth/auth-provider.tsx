'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api, setSessionLostHandler } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { type AuthResponse, CSRF_HEADERS, refreshSession } from './refresh';
import { setAccessToken } from './token-store';

export type User = components['schemas']['UserDto'];

type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous'; user: null };

interface AuthContextValue {
  state: AuthState;
  /** Store the result of a login, signup or refresh. */
  acceptSession(response: AuthResponse): void;
  updateUser(user: User): void;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Refresh a minute before expiry so requests rarely hit a 401 at all.
const REFRESH_LEAD_SECONDS = 60;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearSession = useCallback(() => {
    clearTimeout(timer.current);
    setAccessToken(null);
    setState({ status: 'anonymous', user: null });
  }, []);

  const acceptSession = useCallback(
    (response: AuthResponse) => {
      const schedule = (expiresIn: number) => {
        clearTimeout(timer.current);
        const delay = Math.max(expiresIn - REFRESH_LEAD_SECONDS, 30) * 1000;
        timer.current = setTimeout(() => {
          refreshSession()
            .then((next) => {
              if (!next) return clearSession();
              setState({ status: 'authenticated', user: next.user });
              schedule(next.expiresIn);
            })
            .catch(() => {
              // Network blip: keep the session; the next request retries the refresh.
            });
        }, delay);
      };

      setAccessToken(response.accessToken);
      setState({ status: 'authenticated', user: response.user });
      schedule(response.expiresIn);
    },
    [clearSession],
  );

  useEffect(() => {
    setSessionLostHandler(clearSession);
    // The access token is memory-only, so every page load starts by asking the
    // API whether the refresh cookie still names a live session.
    refreshSession()
      .then((session) => (session ? acceptSession(session) : clearSession()))
      .catch(clearSession);
    return () => clearTimeout(timer.current);
  }, [acceptSession, clearSession]);

  const signOut = useCallback(async () => {
    await api.POST('/api/v1/auth/logout', { headers: CSRF_HEADERS }).catch(() => undefined);
    clearSession();
  }, [clearSession]);

  const updateUser = useCallback((user: User) => {
    setState((prev) => (prev.status === 'authenticated' ? { ...prev, user } : prev));
  }, []);

  const value = useMemo(
    () => ({ state, acceptSession, updateUser, signOut }),
    [state, acceptSession, updateUser, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
