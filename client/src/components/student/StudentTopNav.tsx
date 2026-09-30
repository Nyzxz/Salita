import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '../common/Avatar';

export type StudentTab = 'lectures' | 'quizzes' | 'activities' | 'performance' | 'grades';

const TABS: { id: StudentTab; label: string }[] = [
  { id: 'lectures', label: 'Lectures' },
  { id: 'quizzes', label: 'Quizzes' },
  { id: 'activities', label: 'Activities' },
  { id: 'performance', label: 'Performance Tasks' },
  { id: 'grades', label: 'My Grades' },
];

interface StudentTopNavProps {
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
  studentName: string;
  onSignOut: () => void;
}

export function StudentTopNav({ activeTab, onChangeTab, studentName, onSignOut }: StudentTopNavProps) {
  const buttonRefs = useRef<Partial<Record<StudentTab, HTMLButtonElement>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const el = buttonRefs.current[activeTab];
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeTab]);

  return (
    <header className="sticky top-0 z-20 border-b border-night-border bg-night/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 xl:px-8">
        <Link to="/dashboard/student" className="font-display text-xl font-semibold text-parchment">
          Salita
          <span aria-hidden="true" className="ml-2 inline-block h-1.5 w-6 rounded-full bg-gold" />
        </Link>

        <div className="flex items-center gap-3">
          <Avatar name={studentName} size="sm" accent="leaf" />
          <span className="hidden text-sm text-parchment sm:block">{studentName}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md border border-night-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-clay/50 hover:text-clay"
          >
            Sign out
          </button>
        </div>
      </div>

      <nav aria-label="Dashboard sections" className="mx-auto max-w-[1280px] overflow-x-auto px-4 pb-4 sm:px-6 xl:px-8">
        <div className="relative flex w-max gap-1">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 rounded-full bg-gold transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) buttonRefs.current[tab.id] = el;
                }}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative z-10 flex-none rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  isActive ? 'text-night' : 'text-muted hover:text-parchment'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
