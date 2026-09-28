import type { UserRole } from '@shared/types';

export function dashboardPathFor(role: UserRole): string {
  return role === 'TEACHER' ? '/dashboard/admin' : '/dashboard/student';
}
