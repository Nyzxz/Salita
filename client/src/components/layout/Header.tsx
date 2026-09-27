import type { Section } from '../../App';

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

        <nav aria-label="Sections" className="flex gap-1 self-start rounded-full bg-night-panel p-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeSection;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeSection(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gold text-night'
                    : 'text-muted hover:text-parchment'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
