import type {
  CreateStudentRequest,
  StudentAccount,
  UpdateStudentRequest,
} from '../../../shared/src/types.js';
import { User as UserModel, type UserDocument } from '../models/User.js';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the create-student request body's shape without trusting it. */
export function parseCreateStudentRequest(body: unknown): CreateStudentRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { fullName, username, email, password, section } = body as Record<string, unknown>;
  if (
    typeof fullName !== 'string' ||
    typeof username !== 'string' ||
    typeof email !== 'string' ||
    typeof password !== 'string' ||
    typeof section !== 'string'
  ) {
    return null;
  }
  const trimmed = {
    fullName: fullName.trim(),
    username: username.trim(),
    email: email.trim(),
    password,
    section: section.trim(),
  };
  if (
    Object.values(trimmed).some((v) => v.length === 0) ||
    trimmed.fullName.length > 120 ||
    !/^[a-zA-Z0-9._-]{3,40}$/.test(trimmed.username) ||
    trimmed.email.length > 254 ||
    trimmed.password.length > 128 ||
    trimmed.section.length > 100
  ) return null;
  return trimmed;
}

/** Checks the update-student request body's shape. Every field is optional. */
export function parseUpdateStudentRequest(body: unknown): UpdateStudentRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { fullName, email, section, status, password } = body as Record<string, unknown>;
  const result: UpdateStudentRequest = {};

  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length === 0 || fullName.trim().length > 120) return null;
    result.fullName = fullName.trim();
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || email.trim().length === 0 || email.trim().length > 254) return null;
    result.email = email.trim();
  }
  if (section !== undefined) {
    if (typeof section !== 'string' || section.trim().length === 0 || section.trim().length > 100) return null;
    result.section = section.trim();
  }
  if (status !== undefined) {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') return null;
    result.status = status;
  }
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length === 0 || password.length > 128) return null;
    result.password = password;
  }
  if (Object.keys(result).length === 0) return null;
  return result;
}

function toStudentAccount(record: UserDocument): StudentAccount {
  return {
    id: String(record._id),
    fullName: record.fullName,
    username: record.username,
    email: record.email,
    section: record.section ?? '',
    createdAt: record.createdAt.toISOString(),
    status: record.status,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function getAllStudents(): Promise<StudentAccount[]> {
  const records = await UserModel.find({ role: 'STUDENT' }).sort({ createdAt: -1 });
  return records.map(toStudentAccount);
}

export async function addStudent(
  request: CreateStudentRequest,
): Promise<ServiceResult<StudentAccount>> {
  if (request.password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
  }
  if (!EMAIL_PATTERN.test(request.email)) {
    return { ok: false, status: 400, error: 'Enter a valid email address.' };
  }
  const existing = await UserModel.exists({ username: request.username.toLowerCase() });
  if (existing) {
    return { ok: false, status: 409, error: `Username "${request.username}" is already taken.` };
  }

  try {
    const record = await UserModel.create({
      fullName: request.fullName,
      username: request.username.toLowerCase(),
      email: request.email.toLowerCase(),
      password: request.password,
      role: 'STUDENT',
      section: request.section,
    });
    return { ok: true, data: toStudentAccount(record) };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { ok: false, status: 409, error: 'That username or email is already in use.' };
    }
    throw error;
  }
}

export async function editStudent(
  id: string,
  patch: UpdateStudentRequest,
): Promise<ServiceResult<StudentAccount>> {
  if (patch.password !== undefined && patch.password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
  }
  if (patch.email !== undefined && !EMAIL_PATTERN.test(patch.email)) {
    return { ok: false, status: 400, error: 'Enter a valid email address.' };
  }

  try {
    const record = await UserModel.findOne({ _id: id, role: 'STUDENT' });
    if (!record) {
      return { ok: false, status: 404, error: `No student found with id "${id}".` };
    }

    if (patch.fullName !== undefined) record.fullName = patch.fullName;
    if (patch.email !== undefined) record.email = patch.email.toLowerCase();
    if (patch.section !== undefined) record.section = patch.section;
    if (patch.status !== undefined) record.status = patch.status;
    if (patch.password !== undefined) record.password = patch.password;
    await record.save();
    return { ok: true, data: toStudentAccount(record) };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { ok: false, status: 409, error: 'That email is already in use.' };
    }
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'CastError') {
      return { ok: false, status: 404, error: `No student found with id "${id}".` };
    }
    throw error;
  }
}
