import { timingSafeEqual } from 'node:crypto';
import type { AuthSession, LoginRequest, User, UserRole } from '../../../shared/src/types.js';
import { MOCK_USERS, type MockUserRecord } from '../data/users.data.js';
import { TOKEN_TTL_SECONDS, createToken, verifyToken } from './token.js';

function toPublicUser({ id, username, name, role }: MockUserRecord): User {
  return { id, username, name, role };
}

function passwordsMatch(supplied: string, stored: string): boolean {
  const a = Buffer.from(supplied);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isUserRole(value: unknown): value is UserRole {
  return value === 'STUDENT' || value === 'TEACHER';
}

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

export function login(request: LoginRequest): AuthSession | null {
  const record = MOCK_USERS.find(
    (candidate) => candidate.username.toLowerCase() === request.username.toLowerCase(),
  );
  if (!record || !passwordsMatch(request.password, record.password)) return null;
  if (record.role !== request.role) return null;

  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return {
    user: toPublicUser(record),
    token: createToken({ sub: record.id, role: record.role, exp }),
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export function getUserFromAuthHeader(header: string | undefined): User | null {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice('Bearer '.length).trim());
  if (!payload) return null;
  const record = MOCK_USERS.find((candidate) => candidate.id === payload.sub);
  return record ? toPublicUser(record) : null;
}
