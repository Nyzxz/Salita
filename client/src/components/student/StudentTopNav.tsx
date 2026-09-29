import { Link } from 'react-router-dom';

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
  return (
    <header className="border-b border-night-border bg-night/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link to="/dashboard/student" className="font-display text-xl font-semibold text-parchment">
          Salita
          <span aria-hidden="true" className="ml-2 inline-block h-1.5 w-6 rounded-full bg-gold" />
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-parchment">{studentName}</span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-md border border-night-border px-3 py-1.5 text-muted transition-colors hover:text-parchment"
          >
            Sign out
          </button>
        </div>
      </div>

      <nav
        aria-label="Dashboard sections"
        className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6 pb-4"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeTab(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-none rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-gold text-night' : 'bg-night-panel text-muted hover:text-parchment'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
