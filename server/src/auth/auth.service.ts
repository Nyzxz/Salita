import { timingSafeEqual } from 'node:crypto';
import type { AuthSession, LoginRequest, User, UserRole } from '../../../shared/src/types.js';
import { TEACHERS, findTeacherById, findTeacherByUsername } from '../data/teachers.data.js';
import { findStudentById, findStudentByUsername } from '../data/students.store.js';
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

/**
 * Returns a session on success, or null on ANY failure. Callers should show one
 * generic message so the response never reveals whether a username exists.
 */
export function login(request: LoginRequest): AuthSession | null {
  if (request.role === 'TEACHER') {
    const record = findTeacherByUsername(request.username);
    if (!record || !passwordsMatch(request.password, record.password)) return null;
    const user: User = { id: record.id, username: record.username, name: record.name, role: 'TEACHER' };
    return buildSession(user);
  }

  const record = findStudentByUsername(request.username);
  if (!record) return null;
  if (record.status === 'INACTIVE') return null;
  if (!passwordsMatch(request.password, record.password)) return null;

  const user: User = { id: record.id, username: record.username, name: record.fullName, role: 'STUDENT' };
  return buildSession(user);
}

function buildSession(user: User): AuthSession {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return {
    user,
    token: createToken({ sub: user.id, role: user.role, exp }),
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

/** Resolves the user behind an `Authorization: Bearer <token>` header, or null. */
export function getUserFromAuthHeader(header: string | undefined): User | null {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice('Bearer '.length).trim());
  if (!payload) return null;

  if (payload.role === 'TEACHER') {
    const record = findTeacherById(payload.sub);
    return record ? { id: record.id, username: record.username, name: record.name, role: 'TEACHER' } : null;
  }

  const record = findStudentById(payload.sub);
  // A deactivated student's existing token stops working immediately.
  if (!record || record.status === 'INACTIVE') return null;
  return { id: record.id, username: record.username, name: record.fullName, role: 'STUDENT' };
}

// Kept for anything that still wants the full teacher list (there's only one for now).
export { TEACHERS };
