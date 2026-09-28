import type { Section } from '../../pages/ExplorerPage';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

interface HeaderProps {
  activeSection: Section;
  onChangeSection: (section: Section) => void;
}

const NAV_ITEMS: { id: Section; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'practice', label: 'Practice' },
];

export function Header({ activeSection, onChangeSection }: HeaderProps) {
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b border-night-border bg-night/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-parchment">
            Salita
            <span aria-hidden="true" className="ml-2 inline-block h-2 w-8 rounded-full bg-gold" />
          </h1>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Filipino words, and the six centuries of history packed inside them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Sections" className="flex gap-1 rounded-full bg-night-panel p-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.id === activeSection;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeSection(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-gold text-night' : 'text-muted hover:text-parchment'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted">{session.user.name}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-gold/60 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-gold/60 px-4 py-2 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
