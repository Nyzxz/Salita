import { useAuth } from '../auth/AuthContext';
import { DashboardShell } from '../components/layout/DashboardShell';
import { ModuleGrid } from '../components/layout/ModuleGrid';

export function TeacherDashboard() {
  const { session } = useAuth();

  return (
    <DashboardShell
      title={`Welcome, ${session?.user.name ?? 'teacher'}`}
      subtitle="Your teaching workspace. Here's what will live on this page."
    >
      <ModuleGrid
        modules={[
          {
            title: 'User management',
            description: 'Create student accounts and assign usernames and passwords.',
            href: '/dashboard/admin/users',
          },
          {
            title: 'Content studio',
            description: 'Write lectures, build quizzes, and set activities and performance tasks.',
          },
          {
            title: 'Grading center',
            description: 'Review student submissions, enter scores, and leave feedback.',
            href: '/dashboard/admin/grading',
          },
        ]}
      />
    </DashboardShell>
  );
}
