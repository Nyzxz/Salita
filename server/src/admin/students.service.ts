import { randomInt } from 'node:crypto';
import type {
  CreateStudentRequest,
  GradeLevel,
  ImportStudentResult,
  ImportStudentRow,
  StudentAccount,
  UpdateStudentRequest,
} from '../../../shared/src/types.js';
import { connectDB } from '../config/db.js';
import { csvRow } from '../csv.js';
import { Quiz } from '../models/Quiz.js';
import { QuizRetake } from '../models/QuizRetake.js';
import { QuizStart } from '../models/QuizStart.js';
import { Attachment } from '../models/Attachment.js';
import { LearningContent } from '../models/LearningContent.js';
import { TASKS } from '../data/tasks.data.js';
import { escapeRegExp } from '../pagination.js';
import { sectionExists } from './sections.service.js';
import { isGradeLevel } from '../grades.js';
import { QuizAttempt } from '../models/QuizAttempt.js';
import { Submission } from '../models/Submission.js';
import { User as UserModel, type UserDocument } from '../models/User.js';

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Checks the create-student request body's shape without trusting it. */
export function parseCreateStudentRequest(body: unknown): CreateStudentRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { fullName, username, email, password, section, classSection } = body as Record<string, unknown>;
  if (classSection !== undefined && (typeof classSection !== 'string' || classSection.trim().length > 40)) return null;
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
    !isGradeLevel(trimmed.section)
  ) return null;
  const className = typeof classSection === 'string' ? classSection.trim() : '';
  return { ...(trimmed as CreateStudentRequest), ...(className ? { classSection: className } : {}) };
}

/** Checks the update-student request body's shape. Every field is optional. */
export function parseUpdateStudentRequest(body: unknown): UpdateStudentRequest | null {
  if (typeof body !== 'object' || body === null) return null;
  const { fullName, email, section, classSection, status, password } = body as Record<string, unknown>;
  const result: UpdateStudentRequest = {};
  if (classSection !== undefined) {
    if (typeof classSection !== 'string' || classSection.trim().length > 40) return null;
    result.classSection = classSection.trim();
  }

  if (fullName !== undefined) {
    if (typeof fullName !== 'string' || fullName.trim().length === 0 || fullName.trim().length > 120) return null;
    result.fullName = fullName.trim();
  }
  if (email !== undefined) {
    if (typeof email !== 'string' || email.trim().length === 0 || email.trim().length > 254) return null;
    result.email = email.trim();
  }
  if (section !== undefined) {
    if (typeof section !== 'string' || !isGradeLevel(section.trim())) return null;
    result.section = section.trim() as GradeLevel;
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
    ...(record.classSection ? { classSection: record.classSection } : {}),
    createdAt: record.createdAt.toISOString(),
    status: record.status,
    mustChangePassword: record.mustChangePassword === true,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export interface StudentFilters {
  skip?: number;
  limit?: number;
  /** Case-insensitive match on name, username or email. */
  q?: string;
  section?: GradeLevel;
  classSection?: string;
  status?: StudentAccount['status'];
}

export interface StudentPage {
  items: StudentAccount[];
  total: number;
}

export async function getAllStudents(filters: StudentFilters = {}): Promise<StudentPage> {
  await connectDB();
  const query: Record<string, unknown> = { role: 'STUDENT' };
  if (filters.section) query.section = filters.section;
  if (filters.classSection) query.classSection = filters.classSection;
  if (filters.status) query.status = filters.status;
  if (filters.q) {
    const pattern = new RegExp(escapeRegExp(filters.q), 'i');
    query.$or = [{ fullName: pattern }, { username: pattern }, { email: pattern }];
  }
  const [records, total] = await Promise.all([
    UserModel.find(query)
      .sort({ createdAt: -1 })
      .skip(filters.skip ?? 0)
      .limit(filters.limit ?? 50),
    UserModel.countDocuments(query),
  ]);
  return { items: records.map(toStudentAccount), total };
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
  if (request.classSection && !(await sectionExists(request.section, request.classSection))) {
    return { ok: false, status: 400, error: `${request.section} has no section called “${request.classSection}”. Add it under Sections first.` };
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
      ...(request.classSection ? { classSection: request.classSection } : {}),
      // The teacher hands over a default password; the student must replace it at first sign-in.
      mustChangePassword: true,
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
    // A section belongs to one grade: moving grades drops it unless a matching one is chosen.
    if (patch.section !== undefined && patch.classSection === undefined) record.classSection = undefined;
    if (patch.classSection !== undefined) {
      if (patch.classSection === '') {
        record.classSection = undefined;
      } else if (await sectionExists(record.section ?? '', patch.classSection)) {
        record.classSection = patch.classSection;
      } else {
        return { ok: false, status: 400, error: `${record.section} has no section called “${patch.classSection}”.` };
      }
    }
    if (patch.status !== undefined) {
      record.status = patch.status;
      // Reactivating an account also lifts any sign-in lockout.
      if (patch.status === 'ACTIVE') {
        record.failedLoginAttempts = 0;
        record.lockedUntil = null;
      }
    }
    if (patch.password !== undefined) {
      record.password = patch.password;
      // A teacher-set password is a default again: force a change at next sign-in.
      record.mustChangePassword = true;
      record.passwordChangedAt = new Date();
      record.failedLoginAttempts = 0;
      record.lockedUntil = null;
    }
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


/**
 * Permanently deletes a student account along with their submissions and quiz
 * attempts, so no orphaned records are left behind in the gradebook.
 */
export async function removeStudent(id: string): Promise<ServiceResult<{ id: string }>> {
  try {
    const record = await UserModel.findOne({ _id: id, role: 'STUDENT' });
    if (!record) {
      return { ok: false, status: 404, error: `No student found with id "${id}".` };
    }
    await Promise.all([
      Submission.deleteMany({ studentId: record._id }),
      QuizAttempt.deleteMany({ studentId: record._id }),
      QuizRetake.deleteMany({ studentId: record._id }),
      QuizStart.deleteMany({ studentId: record._id }),
      Attachment.deleteMany({ studentId: record._id }),
    ]);
    await record.deleteOne();
    return { ok: true, data: { id } };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'name' in error && error.name === 'CastError') {
      return { ok: false, status: 404, error: `No student found with id "${id}".` };
    }
    throw error;
  }
}


// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------

/** Rows per request: each account costs a slow password hash, and serverless requests time out. */
export const MAX_IMPORT_ROWS = 10;

/** A default password like "Salita-ana-482193", chosen by the server with a secure random source. */
export function generateDefaultPassword(username: string): string {
  const base = username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'student';
  return `Salita-${base}-${randomInt(100000, 1000000)}`;
}

export function parseImportStudentsRequest(body: unknown): ImportStudentRow[] | null {
  if (typeof body !== 'object' || body === null) return null;
  const { students } = body as Record<string, unknown>;
  if (!Array.isArray(students) || students.length === 0 || students.length > MAX_IMPORT_ROWS) return null;
  const rows: ImportStudentRow[] = [];
  for (const item of students) {
    if (typeof item !== 'object' || item === null) return null;
    const { fullName, username, email, section, classSection } = item as Record<string, unknown>;
    // Rows that don't pass the normal rules are reported per row rather than failing the whole batch.
    rows.push({
      fullName: typeof fullName === 'string' ? fullName : '',
      username: typeof username === 'string' ? username : '',
      email: typeof email === 'string' ? email : '',
      section: (typeof section === 'string' ? section : '') as GradeLevel,
      ...(typeof classSection === 'string' && classSection.trim() ? { classSection: classSection.trim() } : {}),
    });
  }
  return rows;
}

export async function importStudents(rows: ImportStudentRow[]): Promise<ImportStudentResult[]> {
  await connectDB();
  const results: ImportStudentResult[] = [];
  for (const row of rows) {
    const password = generateDefaultPassword(row.username);
    const request = parseCreateStudentRequest({ ...row, password });
    if (!request) {
      results.push({
        username: row.username,
        status: 'skipped',
        reason: 'Check the name, username (3–40 letters, numbers . _ -), email and grade (Grade 7–12).',
      });
      continue;
    }
    const created = await addStudent(request);
    results.push(
      created.ok
        ? { username: request.username.toLowerCase(), status: 'created', password }
        : { username: request.username, status: 'skipped', reason: created.error },
    );
  }
  return results;
}

// ---------------------------------------------------------------------------
// Gradebook export
// ---------------------------------------------------------------------------

/** One CSV: a row per student, a column per task (points earned) and per quiz (best score %). */
export async function buildGradebookCsv(): Promise<string> {
  await connectDB();
  const [students, tasks, quizzes, submissions, attempts] = await Promise.all([
    UserModel.find({ role: 'STUDENT' }).sort({ section: 1, fullName: 1 }).limit(2000).lean(),
    LearningContent.find({ type: { $in: ['ACTIVITY', 'PERFORMANCE_TASK'] } }).sort({ createdAt: 1 }).limit(200).lean(),
    Quiz.find().sort({ createdAt: 1 }).limit(200).select('title').lean(),
    Submission.find({ status: 'GRADED' }).select('taskId studentId grade').lean(),
    QuizAttempt.find().select('quizId studentId percentageScore').lean(),
  ]);

  const taskColumns = [
    ...tasks.map((task) => ({ id: String(task._id), title: task.title ?? 'Task', points: task.totalPoints ?? 0 })),
    ...TASKS.map((task) => ({ id: task.id, title: task.title, points: task.totalPoints })),
  ];
  const grades = new Map<string, number>();
  for (const submission of submissions) {
    if (submission.grade !== undefined) grades.set(`${submission.taskId}:${String(submission.studentId)}`, submission.grade);
  }
  const best = new Map<string, number>();
  for (const attempt of attempts) {
    const key = `${String(attempt.quizId)}:${String(attempt.studentId)}`;
    best.set(key, Math.max(best.get(key) ?? 0, attempt.percentageScore));
  }

  const lines = [
    csvRow([
      'Full name',
      'Username',
      'Grade',
      'Section',
      ...taskColumns.map((task) => `${task.title} (/${task.points})`),
      ...quizzes.map((quiz) => `Quiz: ${quiz.title} (best %)`),
    ]),
  ];
  for (const student of students) {
    const id = String(student._id);
    lines.push(
      csvRow([
        student.fullName,
        student.username,
        student.section ?? '',
        student.classSection ?? '',
        ...taskColumns.map((task) => grades.get(`${task.id}:${id}`) ?? ''),
        ...quizzes.map((quiz) => best.get(`${String(quiz._id)}:${id}`) ?? ''),
      ]),
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}
