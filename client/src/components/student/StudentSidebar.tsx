import type { ComponentType, SVGProps } from 'react';
import { BookIcon, ChartIcon, ClipboardCheckIcon, HomeIcon, QuizIcon, TargetIcon } from '../common/icons';

/** `profile` is reached from the avatar menu, not the sidebar. */
export type StudentTab = 'dashboard' | 'lectures' | 'quizzes' | 'activities' | 'performance' | 'grades' | 'profile';

export const SIDEBAR_TABS: { id: StudentTab; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
  { id: 'lectures', label: 'Lectures', icon: BookIcon },
  { id: 'quizzes', label: 'Quizzes', icon: QuizIcon },
  { id: 'activities', label: 'Activities', icon: ClipboardCheckIcon },
  { id: 'performance', label: 'Performance Tasks', icon: TargetIcon },
  { id: 'grades', label: 'My Grades', icon: ChartIcon },
];

interface StudentSidebarProps {
  activeTab: StudentTab;
  onChangeTab: (tab: StudentTab) => void;
}

/** Left menu on desktop, a scrolling strip on phones. Each button opens only its own section. */
export function StudentSidebar({ activeTab, onChangeTab }: StudentSidebarProps) {
  return (
    <nav aria-label="Dashboard sections" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {SIDEBAR_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          const Icon = tab.icon;
          return (
            <li key={tab.id} className="flex-none lg:flex-auto">
              <button
                type="button"
                onClick={() => onChangeTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 whitespace-nowrap rounded-xl border px-3.5 py-2.5 text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'border-gold/40 bg-gold/10 text-parchment shadow-[0_0_0_3px_rgba(232,169,60,0.06)]'
                    : 'border-transparent text-muted hover:bg-white/5 hover:text-parchment'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-gold' : ''}`} />
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
