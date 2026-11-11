import { useAuth } from '../auth/AuthContext';
import { DashboardShell } from '../components/layout/DashboardShell';
import { ModuleGrid } from '../components/layout/ModuleGrid';
import { BookIcon, ChartIcon, ClipboardCheckIcon, UsersIcon } from '../components/common/icons';

function greetingFor(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof', 'sir', 'maam', "ma'am", 'engr', 'atty']);

/** “Ms. Reyes” stays “Ms. Reyes”; “Maria Reyes” becomes “Maria”. */
export function greetingName(fullName: string | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'there';
  const isTitle = TITLES.has(parts[0].replace(/\./g, '').toLowerCase());
  return isTitle && parts.length > 1 ? `${parts[0]} ${parts[1]}` : parts[0];
}

export function TeacherDashboard() {
  const { session } = useAuth();
  const callName = greetingName(session?.user.name);

  return (
    <DashboardShell
      title={`${greetingFor(new Date().getHours())}, ${callName}`}
      subtitle="Manage your classroom, publish learning content, and review student progress — all in one place."
    >
      <ModuleGrid
        modules={[
          {
            title: 'User management',
            description: 'Create or import student accounts, search the directory, and manage sign-ins.',
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
          {
            title: 'Class analytics',
            description: 'Quiz averages, the questions students miss most, student progress, and a gradebook export.',
            href: '/dashboard/admin/analytics',
            icon: ChartIcon,
          },
        ]}
      />
    </DashboardShell>
  );
}
