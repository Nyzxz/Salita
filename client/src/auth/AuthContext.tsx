import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthSession, LoginRequest, User } from '@shared/types';
import { fetchCurrentUser, loginRequest, logoutRequest } from '../api/auth';
import { ApiRequestError, onUnauthorized } from '../api/client';

/**
 * The real session token lives in an httpOnly cookie that scripts cannot read, so
 * it is never stored here. Only this harmless hint (the user's details and when
 * the session ends) is kept, so a reload can restore the screen without asking
 * the server when nobody was signed in.
 */
const HINT_KEY = 'salita.session-hint';
const LEGACY_STORAGE_KEY = 'salita.session';
/** What the server puts in `token` in place of the real value. */
const COOKIE_SESSION_MARKER = 'cookie-session';

interface AuthContextValue {
  session: AuthSession | null;
  isRestoring: boolean;
  login: (credentials: LoginRequest) => Promise<AuthSession>;
  logout: () => void;
  /** Swap in a fresh session (e.g. after a password change issues a new cookie). */
  replaceSession: (next: AuthSession) => void;
  /** Update the signed-in user's details (e.g. after editing their profile). */
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readHint(): { expiresAt: string } | null {
  try {
    const raw = window.localStorage.getItem(HINT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt?: string };
    if (!parsed.expiresAt || new Date(parsed.expiresAt).getTime() <= Date.now()) return null;
    return { expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeHint(session: AuthSession | null): void {
  try {
    if (session) window.localStorage.setItem(HINT_KEY, JSON.stringify({ expiresAt: session.expiresAt }));
    else window.localStorage.removeItem(HINT_KEY);
  } catch {
    // Storage can be unavailable (private mode); the session just won't survive a reload.
  }
}

function dropLegacyToken(): void {
  try {
    // Earlier versions kept the bearer token here, where any script on the page could read it.
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let cancelled = false;
    dropLegacyToken();
    const hint = readHint();

    if (!hint) {
      writeHint(null);
      setIsRestoring(false);
      return;
    }

    fetchCurrentUser()
      .then((user) => {
        if (!cancelled) setSession({ user, token: COOKIE_SESSION_MARKER, expiresAt: hint.expiresAt });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiRequestError && error.status === 401) writeHint(null);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // If the server stops accepting the cookie (expired, deactivated, password changed elsewhere), sign out here too.
  useEffect(() => {
    onUnauthorized(() => {
      writeHint(null);
      setSession(null);
    });
    return () => onUnauthorized(null);
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const next = await loginRequest(credentials);
    writeHint(next);
    setSession(next);
    return next;
  }, []);

  const logout = useCallback(() => {
    // Ask the server to clear the cookie; the screen signs out immediately either way.
    void logoutRequest().catch(() => undefined);
    writeHint(null);
    setSession(null);
  }, []);

  const replaceSession = useCallback((next: AuthSession) => {
    writeHint(next);
    setSession(next);
  }, []);

  const updateUser = useCallback((user: User) => {
    setSession((current) => (current ? { ...current, user } : current));
  }, []);

  const value = useMemo(
    () => ({ session, isRestoring, login, logout, replaceSession, updateUser }),
    [session, isRestoring, login, logout, replaceSession, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
