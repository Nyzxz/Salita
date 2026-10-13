/**
 * Pure login-lockout rules (no database or HTTP types), so they can be unit
 * tested and shared by the Express route and the Vercel function.
 */
export const MAX_LOGIN_ATTEMPTS = 3;
export const LOCKOUT_MINUTES = 15;

export interface AttemptState {
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
}

export type LoginAttemptResult =
  | { status: 'locked'; retryAfterSeconds: number }
  | { status: 'allowed' };

export type FailureResult =
  | { status: 'invalid_password'; attemptsRemaining: number; nextState: AttemptState }
  | { status: 'locked'; retryAfterSeconds: number; nextState: AttemptState };

export function checkLockout(state: AttemptState, now: number): LoginAttemptResult {
  if (state.lockedUntil && state.lockedUntil.getTime() > now) {
    return {
      status: 'locked',
      retryAfterSeconds: Math.ceil((state.lockedUntil.getTime() - now) / 1000),
    };
  }
  return { status: 'allowed' };
}

export function recordFailedAttempt(state: AttemptState, now: number): FailureResult {
  const attempts = state.failedLoginAttempts + 1;
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    return {
      status: 'locked',
      retryAfterSeconds: LOCKOUT_MINUTES * 60,
      nextState: { failedLoginAttempts: 0, lockedUntil: new Date(now + LOCKOUT_MINUTES * 60_000) },
    };
  }
  return {
    status: 'invalid_password',
    attemptsRemaining: MAX_LOGIN_ATTEMPTS - attempts,
    nextState: { failedLoginAttempts: attempts, lockedUntil: state.lockedUntil ?? null },
  };
}

export function clearedState(): AttemptState {
  return { failedLoginAttempts: 0, lockedUntil: null };
}
