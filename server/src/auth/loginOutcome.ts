import type { ApiResponse, AuthSession } from '../../../shared/src/types.js';
import type { LoginOutcome } from './auth.service.js';

export interface LoginHttpResult {
  status: number;
  body: ApiResponse<AuthSession | null>;
}

/** One place that turns a login outcome into an HTTP status + message. */
export function loginOutcomeToHttp(outcome: LoginOutcome): LoginHttpResult {
  switch (outcome.status) {
    case 'success':
      return { status: 200, body: { success: true, data: outcome.session } };
    case 'locked': {
      const minutes = Math.max(1, Math.ceil(outcome.retryAfterSeconds / 60));
      return {
        status: 423,
        body: {
          success: false,
          data: null,
          error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        },
      };
    }
    case 'invalid_password': {
      const n = outcome.attemptsRemaining;
      return {
        status: 401,
        body: {
          success: false,
          data: null,
          error: `Incorrect password. ${n} attempt${n === 1 ? '' : 's'} remaining before your account is temporarily locked.`,
        },
      };
    }
    default:
      return {
        status: 401,
        body: { success: false, data: null, error: 'Incorrect username, password, or role.' },
      };
  }
}
