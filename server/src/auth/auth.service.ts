import { timingSafeEqual } from 'node:crypto';
import type {
  AuthSession,
  ChangePasswordRequest,
  LoginRequest,
  UpdateProfileRequest,
  User,
  UserRole,
} from '../../../shared/src/types.js';
import { TEACHERS, findTeacherByUsername } from '../data/teachers.data.js';
import { findStudentByUsername } from '../data/students.store.js';
import { connectDB } from '../config/db.js';
import { User as UserModel, type UserDocument } from '../models/User.js';
import { checkLockout, clearedState, recordFailedAttempt } from './loginAttempts.js';
import { TOKEN_TTL_SECONDS, createToken, verifyToken } from './token.js';

/**
 * Pure auth logic with no Express or Vercel types in it, so the local Express
 * routes and the Vercel serverless functions share exactly one implementation.
 */

function passwordsMatch(supplied: string, stored: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'STUDENT' || value === 'TEACHER';
}

/** Checks the request body's shape without trusting it. */
export function parseLoginRequest(body: unknown): LoginRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { username, password, role } = body as Record<string, unknown>;
  if (typeof username !== 'string' || typeof password !== 'string' || !isUserRole(role)) {
    return null;
  }
  const trimmed = username.trim();
  if (trimmed.length === 0 || password.length === 0) return null;
  return { username: trimmed, password, role };
}

function toPublicUser(record: UserDocument): User {
  return {
    id: String(record._id),
    username: record.username,
    name: record.fullName,
    role: record.role,
    email: record.email,
    ...(record.section ? { section: record.section } : {}),
    mustChangePassword: record.mustChangePassword === true,
  };
}

function buildSession(record: UserDocument): AuthSession {
  const user = toPublicUser(record);
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return {
    user,
    token: createToken({ sub: user.id, role: user.role, exp }),
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

async function migrateLegacyUser(request: LoginRequest): Promise<UserDocument | null> {
  if (request.role === 'TEACHER') {
    const legacy = findTeacherByUsername(request.username);
    if (!legacy || !passwordsMatch(request.password, legacy.password)) return null;

    return UserModel.create({
      fullName: legacy.name,
      username: legacy.username,
      email: `${legacy.username}@salita.local`,
      password: legacy.password,
      role: 'TEACHER',
    });
  }

  const legacy = findStudentByUsername(request.username);
  if (!legacy || legacy.status !== 'ACTIVE' || !passwordsMatch(request.password, legacy.password)) {
    return null;
  }

  return UserModel.create({
    fullName: legacy.fullName,
    username: legacy.username,
    email: legacy.email,
    password: legacy.password,
    role: 'STUDENT',
    section: legacy.section,
    status: legacy.status,
    createdAt: new Date(legacy.createdAt),
  });
}

export type LoginOutcome =
  | { status: 'success'; session: AuthSession }
  | { status: 'invalid_credentials' }
  | { status: 'invalid_password'; attemptsRemaining: number }
  | { status: 'locked'; retryAfterSeconds: number };

/**
 * Signs a user in. Unknown username, wrong role, and deactivated accounts all
 * return the same generic `invalid_credentials` (and are not tracked), so the
 * lockout can't be used to discover which usernames exist.
 */
export async function login(request: LoginRequest): Promise<LoginOutcome> {
  await connectDB();
  const username = request.username.trim().toLowerCase();
  let record: UserDocument | null = await UserModel.findOne({ username });

  if (!record) {
    try {
      record = await migrateLegacyUser(request);
    } catch (error) {
      record = await UserModel.findOne({ username });
      if (!record) throw error;
    }
  }

  if (!record || record.role !== request.role || record.status === 'INACTIVE') {
    return { status: 'invalid_credentials' };
  }

  const now = Date.now();
  const lock = checkLockout(record, now);
  if (lock.status === 'locked') return lock;

  if (!(await record.comparePassword(request.password))) {
    const failure = recordFailedAttempt(record, now);
    record.failedLoginAttempts = failure.nextState.failedLoginAttempts;
    record.lockedUntil = failure.nextState.lockedUntil ?? null;
    await record.save();
    return failure.status === 'locked'
      ? { status: 'locked', retryAfterSeconds: failure.retryAfterSeconds }
      : { status: 'invalid_password', attemptsRemaining: failure.attemptsRemaining };
  }

  if (record.failedLoginAttempts !== 0 || record.lockedUntil) {
    const cleared = clearedState();
    record.failedLoginAttempts = cleared.failedLoginAttempts;
    record.lockedUntil = cleared.lockedUntil;
    await record.save();
  }
  return { status: 'success', session: buildSession(record) };
}

/**
 * Resolves the user behind an `Authorization: Bearer <token>` header, or null.
 *
 * A user who still has to replace their default password is treated as not
 * signed in, unless the caller opts in with `allowPasswordChange` (only the
 * profile / change-password endpoint does).
 */
export async function getUserFromAuthHeader(
  header: string | undefined,
  options: { allowPasswordChange?: boolean } = {},
): Promise<User | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice('Bearer '.length).trim());
  if (!payload) return null;

  try {
    await connectDB();
    const record = await UserModel.findById(payload.sub);
    if (!record || record.role !== payload.role || record.status === 'INACTIVE') return null;
    if (record.mustChangePassword && !options.allowPasswordChange) return null;
    return toPublicUser(record);
  } catch {
    return null;
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AccountResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

export function parseUpdateProfileRequest(body: unknown): UpdateProfileRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { fullName, email } = body as Record<string, unknown>;
  const result: UpdateProfileRequest = {};
  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length === 0 || fullName.trim().length > 120) return null;
    result.fullName = fullName.trim();
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || email.trim().length === 0 || email.trim().length > 254) return null;
    result.email = email.trim();
  }
  return Object.keys(result).length === 0 ? null : result;
}

export function parseChangePasswordRequest(body: unknown): ChangePasswordRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { currentPassword, newPassword } = body as Record<string, unknown>;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') return null;
  if (currentPassword.length === 0 || currentPassword.length > 128 || newPassword.length > 128) return null;
  return { currentPassword, newPassword };
}

/** Why a proposed new password is not acceptable, or null when it is fine. */
export function passwordProblem(newPassword: string, currentPassword: string, username: string): string | null {
  if (newPassword.length < 8) return 'Your new password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    return 'Your new password must include at least one letter and one number.';
  }
  if (newPassword === currentPassword) return 'Choose a password that is different from your current one.';
  if (newPassword.toLowerCase().includes(username.toLowerCase())) {
    return 'Your password should not contain your username.';
  }
  return null;
}

export async function updateProfile(userId: string, patch: UpdateProfileRequest): Promise<AccountResult<User>> {
  if (patch.email !== undefined && !EMAIL_PATTERN.test(patch.email)) {
    return { ok: false, status: 400, error: 'Enter a valid email address.' };
  }
  await connectDB();
  const record = await UserModel.findById(userId);
  if (!record) return { ok: false, status: 404, error: 'Account not found.' };
  if (patch.fullName !== undefined) record.fullName = patch.fullName;
  if (patch.email !== undefined) record.email = patch.email.toLowerCase();
  try {
    await record.save();
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      return { ok: false, status: 409, error: 'That email is already in use.' };
    }
    throw error;
  }
  return { ok: true, data: toPublicUser(record) };
}

/** Verifies the current password, sets the new one, clears the forced-change flag, and signs the user in afresh. */
export async function changePassword(userId: string, request: ChangePasswordRequest): Promise<AccountResult<AuthSession>> {
  await connectDB();
  const record = await UserModel.findById(userId);
  if (!record) return { ok: false, status: 404, error: 'Account not found.' };
  if (!(await record.comparePassword(request.currentPassword))) {
    return { ok: false, status: 400, error: 'Your current password is not correct.' };
  }
  const problem = passwordProblem(request.newPassword, request.currentPassword, record.username);
  if (problem) return { ok: false, status: 400, error: problem };

  record.password = request.newPassword;
  record.mustChangePassword = false;
  await record.save();
  return { ok: true, data: buildSession(record) };
}

// Kept for anything that still wants the full teacher list (there's only one for now).
export { TEACHERS };
