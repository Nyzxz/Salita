import type { AuthSession } from '../../../shared/src/types.js';
import { COOKIE_SESSION_MARKER, buildSessionCookie } from './cookies.js';

/** Splits a fresh session into the cookie to set and the token-free body to send. */
export function toCookieSession(session: AuthSession): { session: AuthSession; setCookie: string } {
  const maxAge = (new Date(session.expiresAt).getTime() - Date.now()) / 1000;
  return {
    session: { ...session, token: COOKIE_SESSION_MARKER },
    setCookie: buildSessionCookie(session.token, maxAge),
  };
}
