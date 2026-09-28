import type { User } from '../../../shared/src/types.js';

export interface MockUserRecord extends User {
  password: string;
}

export const MOCK_USERS: MockUserRecord[] = [
  {
    id: 'user-teacher-1',
    username: 'teacher',
    name: 'Ms. Reyes',
    role: 'TEACHER',
    password: 'Project123Go',
  },
  {
    id: 'user-student-1',
    username: 'maria',
    name: 'Maria Santos',
    role: 'STUDENT',
    password: 'student123',
  },
  {
    id: 'user-student-2',
    username: 'jun',
    name: 'Jun Dela Cruz',
    role: 'STUDENT',
    password: 'student123',
  },
];
