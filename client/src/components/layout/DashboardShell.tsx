import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

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
      <header className="border-b border-night-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-display text-xl font-semibold text-parchment">
            Salita
            <span aria-hidden="true" className="ml-2 inline-block h-1.5 w-6 rounded-full bg-gold" />
          </Link>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-parchment">{session?.user.name}</span>
            <span className="rounded-full border border-gold/50 px-2.5 py-0.5 text-xs text-gold">
              {session ? ROLE_LABEL[session.user.role] : ''}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-md border border-night-border px-3 py-1.5 text-muted transition-colors hover:text-parchment"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="font-display text-3xl font-semibold text-parchment">{title}</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">{subtitle}</p>
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
