import { timingSafeEqual } from 'node:crypto';
import type { AuthSession, LoginRequest, User, UserRole } from '../../../shared/src/types.js';
import { TEACHERS, findTeacherByUsername } from '../data/teachers.data.js';
import { findStudentByUsername } from '../data/students.store.js';
import { connectDB } from '../config/db.js';
import { User as UserModel, type UserDocument } from '../models/User.js';
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

/** Returns a session on success, or null on any credential/role failure. */
export async function login(request: LoginRequest): Promise<AuthSession | null> {
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

  if (!record || record.role !== request.role || record.status === 'INACTIVE') return null;
  if (!(await record.comparePassword(request.password))) return null;
  return buildSession(record);
}

/** Resolves the user behind an `Authorization: Bearer <token>` header, or null. */
export async function getUserFromAuthHeader(header: string | undefined): Promise<User | null> {
  if (!header?.startsWith('Bearer ')) return null;
  const payload = verifyToken(header.slice('Bearer '.length).trim());
  if (!payload) return null;

  try {
    await connectDB();
    const record = await UserModel.findById(payload.sub);
    if (!record || record.role !== payload.role || record.status === 'INACTIVE') return null;
    return toPublicUser(record);
  } catch {
    return null;
  }
}

// Kept for anything that still wants the full teacher list (there's only one for now).
export { TEACHERS };
