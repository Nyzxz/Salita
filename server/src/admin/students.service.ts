import type {
  CreateStudentRequest,
  StudentAccount,
  UpdateStudentRequest,
} from '../../../shared/src/types.js';
import {
  createStudent,
  findStudentById,
  findStudentByUsername,
  listStudents,
  toPublicStudent,
  updateStudent,
} from '../data/students.store.js';

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
  if (Object.values(trimmed).some((v) => v.length === 0)) return null;
  return trimmed;
}

/** Checks the update-student request body's shape. Every field is optional. */
export function parseUpdateStudentRequest(body: unknown): UpdateStudentRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { fullName, email, section, status, password } = body as Record<string, unknown>;
  const result: UpdateStudentRequest = {};

  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length === 0) return null;
    result.fullName = fullName.trim();
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || email.trim().length === 0) return null;
    result.email = email.trim();
  }
  if (section !== undefined) {
    if (typeof section !== 'string' || section.trim().length === 0) return null;
    result.section = section.trim();
  }
  if (status !== undefined) {
    if (status !== 'ACTIVE' && status !== 'INACTIVE') return null;
    result.status = status;
  }
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length === 0) return null;
    result.password = password;
  }
  if (Object.keys(result).length === 0) return null;
  return result;
}

export function getAllStudents(): StudentAccount[] {
  return listStudents().map(toPublicStudent);
}

export function addStudent(request: CreateStudentRequest): ServiceResult<StudentAccount> {
  if (request.password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
  }
  if (!EMAIL_PATTERN.test(request.email)) {
    return { ok: false, status: 400, error: 'Enter a valid email address.' };
  }
  if (findStudentByUsername(request.username)) {
    return { ok: false, status: 409, error: `Username "${request.username}" is already taken.` };
  }
  const record = createStudent(request);
  return { ok: true, data: toPublicStudent(record) };
}

export function editStudent(id: string, patch: UpdateStudentRequest): ServiceResult<StudentAccount> {
  if (patch.password !== undefined && patch.password.length < 6) {
    return { ok: false, status: 400, error: 'Password must be at least 6 characters.' };
  }
  if (patch.email !== undefined && !EMAIL_PATTERN.test(patch.email)) {
    return { ok: false, status: 400, error: 'Enter a valid email address.' };
  }
  if (!findStudentById(id)) {
    return { ok: false, status: 404, error: `No student found with id "${id}".` };
  }
  const updated = updateStudent(id, patch);
  return { ok: true, data: toPublicStudent(updated!) };
}
