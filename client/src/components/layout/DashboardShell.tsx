import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { Avatar } from '../common/Avatar';
import { Brand } from '../common/Brand';
import { LogOutIcon } from '../common/icons';
import { AppFooter } from './AppFooter';

interface DashboardShellProps {
  title: string;
  subtitle: string;
  /** Optional crumb above the title, e.g. "Teacher workspace". */
  eyebrow?: string;
  /** Optional element aligned right of the title (e.g. a back link). */
  actions?: ReactNode;
  children: ReactNode;
}

const ROLE_LABEL = { STUDENT: 'Student', TEACHER: 'Teacher' } as const;

export function DashboardShell({ title, subtitle, eyebrow = 'Teacher workspace', actions, children }: DashboardShellProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="glass sticky top-0 z-30 border-b border-night-border">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <Brand to="/dashboard/admin" />

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex">
              <div className="text-right leading-tight">
                <p className="text-sm font-medium text-parchment">{session?.user.name}</p>
                <p className="text-xs text-gold-soft">{session ? ROLE_LABEL[session.user.role] : ''}</p>
              </div>
              <Avatar name={session?.user.name ?? '?'} size="sm" />
            </div>
            <span aria-hidden="true" className="hidden h-6 w-px bg-night-border sm:block" />
            <button type="button" onClick={handleSignOut} className="btn-ghost btn-sm" aria-label="Sign out">
              <LogOutIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="aurora-backdrop grid-dots relative overflow-hidden border-b border-night-border">
        <div className="relative z-10 mx-auto flex max-w-[1280px] flex-wrap items-end justify-between gap-4 px-4 py-10 sm:px-6 sm:py-12 xl:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow animate-fade-in-up">{eyebrow}</p>
            <h1 className="animate-fade-in-up mt-2 text-3xl font-semibold text-parchment sm:text-4xl">{title}</h1>
            <p className="animate-fade-in-up mt-3 text-sm leading-relaxed text-muted sm:text-base">{subtitle}</p>
          </div>
          {actions}
        </div>
      </div>

      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-10 sm:px-6 xl:px-8">
        <div className="animate-fade-in">{children}</div>
      </main>

      <AppFooter />
    </div>
  );
}
