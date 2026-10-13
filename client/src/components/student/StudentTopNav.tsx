import { useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import { Avatar } from '../common/Avatar';
import { Brand } from '../common/Brand';
import {
  BookIcon,
  ChartIcon,
  ClipboardCheckIcon,
  LogOutIcon,
  QuizIcon,
  TargetIcon,
} from '../common/icons';

export type StudentTab = 'lectures' | 'quizzes' | 'activities' | 'performance' | 'grades';

const TABS: { id: StudentTab; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'lectures', label: 'Lectures', icon: BookIcon },
  { id: 'quizzes', label: 'Quizzes', icon: QuizIcon },
  { id: 'activities', label: 'Activities', icon: ClipboardCheckIcon },
  { id: 'performance', label: 'Performance Tasks', icon: TargetIcon },
  { id: 'grades', label: 'My Grades', icon: ChartIcon },
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
    <header className="glass sticky top-0 z-30 border-b border-night-border">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <Brand to="/dashboard/student" />

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 sm:flex">
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-parchment">{studentName}</p>
              <p className="text-xs text-leaf">Student</p>
            </div>
            <Avatar name={studentName} size="sm" accent="leaf" />
          </div>
          <span aria-hidden="true" className="hidden h-6 w-px bg-night-border sm:block" />
          <button type="button" onClick={onSignOut} className="btn-ghost btn-sm" aria-label="Sign out">
            <LogOutIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      <nav aria-label="Dashboard sections" className="mx-auto max-w-[1280px] overflow-x-auto px-4 sm:px-6 xl:px-8">
        <div className="relative flex w-max gap-1">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                ref={(el) => {
                  if (el) buttonRefs.current[tab.id] = el;
                }}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-none items-center gap-2 px-3.5 py-3 text-sm font-medium transition-colors duration-200 ${
                  isActive ? 'text-parchment' : 'text-muted hover:text-parchment'
                }`}
              >
                <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-gold' : ''}`} />
                {tab.label}
              </button>
            );
          })}
          <span
            aria-hidden="true"
            className="absolute bottom-0 h-0.5 rounded-full bg-gold shadow-[0_0_12px_rgba(232,169,60,0.7)] transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
        </div>
      </nav>
    </header>
  );
}
