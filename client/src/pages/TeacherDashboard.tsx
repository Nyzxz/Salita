import { useAuth } from '../auth/AuthContext';
import { DashboardShell } from '../components/layout/DashboardShell';
import { ModuleGrid } from '../components/layout/ModuleGrid';
import { BookIcon, ClipboardCheckIcon, UsersIcon } from '../components/common/icons';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function TeacherDashboard() {
  const { session } = useAuth();
  const firstName = session?.user.name.split(' ')[0] ?? 'there';

  return (
    <DashboardShell
      title={`${greetingFor(new Date().getHours())}, ${firstName}`}
      subtitle="Your teaching workspace. Here's what will live on this page."
    >
      <ModuleGrid
        modules={[
          {
            title: 'User management',
            description: 'Create student accounts and assign usernames and passwords.',
            href: '/dashboard/admin/users',
            icon: UsersIcon,
          },
          {
            title: 'Content studio',
            description: 'Write lectures, build quizzes, and set activities and performance tasks.',
            href: '/dashboard/admin/studio',
            icon: BookIcon,
          },
          {
            title: 'Grading center',
            description: 'Review student submissions, enter scores, and leave feedback.',
            href: '/dashboard/admin/grading',
            icon: ClipboardCheckIcon,
          },
        ]}
      />
    </DashboardShell>
  );
}
