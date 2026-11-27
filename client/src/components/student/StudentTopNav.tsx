import { useAuth } from '../../auth/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../common/Avatar';
import { NotificationBell } from '../common/NotificationBell';
import { Brand } from '../common/Brand';
import { CloseIcon, LogOutIcon, MenuIcon, UserIcon } from '../common/icons';
import { SIDEBAR_TABS, type StudentTab } from './StudentSidebar';

interface StudentTopNavProps {
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
  studentName: string;
  onSignOut: () => void;
}

/** Top bar: the student's initials open a menu with Profile and Log out. */
export function StudentTopNav({ activeTab, onChangeTab, studentName, onSignOut }: StudentTopNavProps) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <header className="glass sticky top-0 z-30 border-b border-night-border">
      <div className="mx-auto flex h-16 max-w-[1400px] 2xl:max-w-[1760px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            className="-ml-1 rounded-lg p-2 text-parchment transition hover:bg-white/5 lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="student-mobile-menu"
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
          <Brand to="/dashboard/student" />
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div ref={rootRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-haspopup="menu"
              aria-expanded={open}
              aria-label={`Account menu for ${studentName}`}
              className="flex items-center gap-2 rounded-full p-0.5 transition hover:ring-2 hover:ring-gold/40 focus-visible:ring-2 focus-visible:ring-gold"
            >
              <Avatar name={studentName} size="md" accent="leaf" userId={session?.user.id} avatarVersion={session?.user.avatarVersion} />
            </button>
            {open && (
              <div role="menu" className="surface absolute right-0 top-full z-40 mt-2 w-60 animate-fade-in overflow-hidden p-1.5 shadow-xl">
                <div className="px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-parchment">{studentName}</p>
                  <p className="text-xs text-leaf">Student</p>
                </div>
                <div className="my-1 h-px bg-night-border" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onChangeTab('profile'); }}
                  aria-current={activeTab === 'profile' ? 'page' : undefined}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-parchment transition hover:bg-white/5"
                >
                  <UserIcon className="h-4 w-4 text-gold" />
                  Profile management
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setOpen(false); onSignOut(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-parchment transition hover:bg-white/5"
                >
                  <LogOutIcon className="h-4 w-4 text-clay" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {menuOpen && (
        <nav id="student-mobile-menu" aria-label="Dashboard sections" className="border-t border-night-border px-4 py-3 lg:hidden">
          <ul className="mx-auto flex max-w-md flex-col gap-1">
            {[...SIDEBAR_TABS, { id: 'profile' as StudentTab, label: 'Profile management', icon: UserIcon }].map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => { setMenuOpen(false); onChangeTab(tab.id); }}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm font-medium transition ${isActive ? 'border-gold/40 bg-gold/10 text-parchment' : 'border-transparent text-muted hover:bg-white/5 hover:text-parchment'}`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-gold' : ''}`} />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
