import { timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
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
import { recordIpFailure, throttleSecondsLeft } from './ipThrottle.js';
import { CSRF_HEADER, CSRF_VALUE, SESSION_COOKIE, readCookie } from './cookies.js';
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
    ...(record.classSection ? { classSection: record.classSection } : {}),
    mustChangePassword: record.mustChangePassword === true,
  };
}

function buildSession(record: UserDocument): AuthSession {
  const user = toPublicUser(record);
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return {
    user,
    token: createToken({ sub: user.id, role: user.role, exp, iat: Math.floor(Date.now() / 1000) }),
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
  /** Every credential problem looks the same: unknown user, wrong role, deactivated, wrong password, or locked. */
  | { status: 'invalid_credentials' }
  /** Too many failures from one network address. Says nothing about any account. */
  | { status: 'rate_limited'; retryAfterSeconds: number };

let dummyHash: Promise<string> | null = null;

/** Burns the same bcrypt time as a real check, so response time doesn't reveal whether a username exists. */
async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= bcrypt.hash('salita-timing-equalizer', 12);
  await bcrypt.compare(password, await dummyHash);
}

/**
 * Signs a user in.
 *
 * Unknown username, wrong role, deactivated account, wrong password and a
 * locked account all produce the identical `invalid_credentials` outcome and
 * take about the same time, so neither the message nor the timing reveals which
 * usernames exist. The 3-attempt account lockout still applies silently;
 * `ipThrottle` adds a per-network limit so one person can't lock many accounts.
 */
export async function login(request: LoginRequest, clientIp?: string): Promise<LoginOutcome> {
  await connectDB();

  const retryAfterSeconds = await throttleSecondsLeft(clientIp);
  if (retryAfterSeconds > 0) return { status: 'rate_limited', retryAfterSeconds };

  const fail = async (): Promise<LoginOutcome> => {
    await recordIpFailure(clientIp);
    return { status: 'invalid_credentials' };
  };

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
    await burnPasswordCheck(request.password);
    return fail();
  }

  const now = Date.now();
  if (checkLockout(record, now).status === 'locked') {
    await burnPasswordCheck(request.password);
    return fail();
  }

  if (!(await record.comparePassword(request.password))) {
    const failure = recordFailedAttempt(record, now);
    record.failedLoginAttempts = failure.nextState.failedLoginAttempts;
    record.lockedUntil = failure.nextState.lockedUntil ?? null;
    await record.save();
    return fail();
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
    // A password change/reset invalidates every token issued before it.
    if (record.passwordChangedAt && (payload.iat ?? 0) < Math.floor(record.passwordChangedAt.getTime() / 1000)) return null;
    return toPublicUser(record);
  } catch {
    return null;
  }
}

/** The parts of a request that sign-in needs; satisfied by both Express and Vercel requests. */
export interface AuthRequestLike {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
}

/**
 * Resolves the signed-in user for a request.
 *
 * The token normally arrives in the httpOnly session cookie. A cookie is sent
 * automatically by the browser, so for anything that changes data it must come
 * with the custom `X-Requested-With` header (plus the cookie is SameSite=Strict),
 * which a cross-site page cannot add. A Bearer header is still accepted for
 * scripts and tests; it is never sent automatically, so it needs no such header.
 */
export async function getUserFromRequest(
  request: AuthRequestLike,
  options: { allowPasswordChange?: boolean } = {},
): Promise<User | null> {
  const authorization = request.headers.authorization;
  const bearer = typeof authorization === 'string' ? authorization : undefined;
  if (bearer?.startsWith('Bearer ')) return getUserFromAuthHeader(bearer, options);

  const cookieToken = readCookie(request.headers, SESSION_COOKIE);
  if (!cookieToken) return null;

  const method = (request.method ?? 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    const marker = request.headers[CSRF_HEADER];
    if ((Array.isArray(marker) ? marker[0] : marker) !== CSRF_VALUE) return null;
  }
  return getUserFromAuthHeader(`Bearer ${cookieToken}`, options);
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
  record.passwordChangedAt = new Date();
  await record.save();
  return { ok: true, data: buildSession(record) };
}

// Kept for anything that still wants the full teacher list (there's only one for now).
export { TEACHERS };
