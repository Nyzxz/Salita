import type { User } from '../../../shared/src/types.js';

export interface TeacherRecord extends User {
  password: string;
}

/**
 * In-memory teacher account(s). Passwords are plain text ON PURPOSE — this is
 * mock data with no database. A real system would store salted hashes
 * (bcrypt/argon2) and never ship credentials in source control.
 */
export const TEACHERS: TeacherRecord[] = [
  {
    id: 'user-teacher-1',
    username: 'teacher',
    name: 'Ms. Reyes',
    role: 'TEACHER',
    password: 'Project123Go',
  },
];

export function findTeacherByUsername(username: string): TeacherRecord | undefined {
  return TEACHERS.find((t) => t.username.toLowerCase() === username.toLowerCase());
}

export function findTeacherById(id: string): TeacherRecord | undefined {
  return TEACHERS.find((t) => t.id === id);
}
