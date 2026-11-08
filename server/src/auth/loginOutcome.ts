import type { ApiResponse, AuthSession } from '../../../shared/src/types.js';
import type { LoginOutcome } from './auth.service.js';
import { toCookieSession } from './sessionResponse.js';

export interface LoginHttpResult {
  status: number;
  body: ApiResponse<AuthSession | null>;
  /** Seconds for a Retry-After header, when throttled. */
  retryAfterSeconds?: number;
  /** Set-Cookie header value carrying the session token (never put in the body). */
  setCookie?: string;
}

/**
 * One generic message for every credential failure (see login()). It states
 * the lockout policy for everyone, so a real student who is locked out still
 * understands what happened without the API revealing which accounts exist.
 */
export const GENERIC_LOGIN_ERROR =
  'Incorrect username, password, or role. After 3 failed attempts an account is locked for 15 minutes.';

/** One place that turns a login outcome into an HTTP status + message. */
export function loginOutcomeToHttp(outcome: LoginOutcome): LoginHttpResult {
  switch (outcome.status) {
    case 'success': {
      const { session, setCookie } = toCookieSession(outcome.session);
      return { status: 200, setCookie, body: { success: true, data: session } };
    }
    case 'rate_limited': {
      const minutes = Math.max(1, Math.ceil(outcome.retryAfterSeconds / 60));
      return {
        status: 429,
        retryAfterSeconds: outcome.retryAfterSeconds,
        body: {
          success: false,
          data: null,
          error: `Too many sign-in attempts from this network. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        },
      };
    }
    default:
      return { status: 401, body: { success: false, data: null, error: GENERIC_LOGIN_ERROR } };
  }
}
