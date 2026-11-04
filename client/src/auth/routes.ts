import type { User, UserRole } from '@shared/types';

export function dashboardPathFor(role: UserRole): string {
  return role === 'TEACHER' ? '/dashboard/admin' : '/dashboard/student';
}

export const CHANGE_PASSWORD_PATH = '/change-password';

/** Where a freshly signed-in user should land: the forced password change first, if one is pending. */
export function homePathFor(user: User): string {
  return user.mustChangePassword ? CHANGE_PASSWORD_PATH : dashboardPathFor(user.role);
}
