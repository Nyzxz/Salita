import type { User } from '../../../shared/src/types.js';

export interface TeacherRecord extends User {
  password: string;
}

/**
 * In-memory teacher account(s). Passwords are plain text ON PURPOSE — this is
 * mock data with no database. A real system would store salted hashes
 * (bcrypt/argon2) and never ship credentials in source control.
 */
const devTeacherPassword = process.env.DEV_TEACHER_PASSWORD;

export const TEACHERS: TeacherRecord[] = devTeacherPassword
  ? [
      {
        id: 'user-teacher-1',
        username: 'teacher',
        name: 'Ms. Reyes',
        role: 'TEACHER',
        password: devTeacherPassword,
      },
    ]
  : [];

export function findTeacherByUsername(username: string): TeacherRecord | undefined {
  return TEACHERS.find((t) => t.username.toLowerCase() === username.toLowerCase());
}

export function findTeacherById(id: string): TeacherRecord | undefined {
  return TEACHERS.find((t) => t.id === id);
}
