import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../common/Avatar';

interface DashboardShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const ROLE_LABEL = { STUDENT: 'Student', TEACHER: 'Teacher' } as const;

export function DashboardShell({ title, subtitle, children }: DashboardShellProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-night-border bg-night/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
          <Link to="/" className="font-display text-xl font-semibold text-parchment">
            Salita
            <span aria-hidden="true" className="ml-2 inline-block h-1.5 w-6 rounded-full bg-gold" />
          </Link>

          <div className="flex items-center gap-3">
            <Avatar name={session?.user.name ?? '?'} size="sm" />
            <div className="hidden text-sm sm:block">
              <p className="text-parchment">{session?.user.name}</p>
              <p className="text-xs text-gold">{session ? ROLE_LABEL[session.user.role] : ''}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-night-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-clay/50 hover:text-clay"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="aurora-backdrop relative overflow-hidden border-b border-night-border">
        <div className="relative z-10 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 xl:px-8">
          <h1 className="animate-fade-in-up font-display text-3xl font-semibold text-parchment sm:text-4xl">
            {title}
          </h1>
          <p className="animate-fade-in-up mt-2 max-w-prose text-sm text-muted">{subtitle}</p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6 xl:px-8">
        <div className="animate-fade-in">{children}</div>
      </main>
    </div>
  );
}
