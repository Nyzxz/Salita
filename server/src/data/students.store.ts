import type { StudentAccount } from '../../../shared/src/types.js';

export interface StudentRecord extends StudentAccount {
  password: string;
}

export interface CreateStudentInput {
  fullName: string;
  username: string;
  email: string;
  password: string;
  section: string;
}

export interface UpdateStudentInput {
  fullName?: string;
  email?: string;
  section?: string;
  status?: StudentAccount['status'];
  password?: string;
}

/**
 * In-memory student directory, seeded with the two demo accounts from the
 * login feature. This is a plain mutable array standing in for a database.
 *
 * IMPORTANT — Vercel: serverless functions are stateless between invocations
 * (no shared memory, and no guarantee of hitting the same instance twice), so
 * a student created here through the Vercel API will not reliably persist
 * across requests in production. This works fully for local `npm run dev`
 * (one long-running Express process). Moving to real storage (Postgres,
 * Redis, etc.) only requires changing the functions in this file.
 */
export const STUDENTS: StudentRecord[] = [
  {
    id: 'user-student-1',
    fullName: 'Maria Santos',
    username: 'maria',
    email: 'maria@example.com',
    section: 'Grade 10 - Rizal',
    createdAt: '2026-01-10T00:00:00.000Z',
    status: 'ACTIVE',
    password: 'student123',
  },
  {
    id: 'user-student-2',
    fullName: 'Jun Dela Cruz',
    username: 'jun',
    email: 'jun@example.com',
    section: 'Grade 10 - Bonifacio',
    createdAt: '2026-01-12T00:00:00.000Z',
    status: 'ACTIVE',
    password: 'student123',
  },
];

let nextId = STUDENTS.length + 1;

export function toPublicStudent(record: StudentRecord): StudentAccount {
  const { password: _password, ...publicFields } = record;
  return publicFields;
}

export function listStudents(): StudentRecord[] {
  return STUDENTS;
}

export function findStudentByUsername(username: string): StudentRecord | undefined {
  return STUDENTS.find((s) => s.username.toLowerCase() === username.toLowerCase());
}

export function findStudentById(id: string): StudentRecord | undefined {
  return STUDENTS.find((s) => s.id === id);
}

export function createStudent(input: CreateStudentInput): StudentRecord {
  const record: StudentRecord = {
    id: `user-student-${nextId++}`,
    fullName: input.fullName,
    username: input.username,
    email: input.email,
    section: input.section,
    createdAt: new Date().toISOString(),
    status: 'ACTIVE',
    password: input.password,
  };
  STUDENTS.push(record);
  return record;
}

export function updateStudent(id: string, patch: UpdateStudentInput): StudentRecord | undefined {
  const record = findStudentById(id);
  if (!record) return undefined;
  Object.assign(record, patch);
  return record;
}
