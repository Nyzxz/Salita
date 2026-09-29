import { Link } from 'react-router-dom';

export interface ModuleInfo {
  title: string;
  description: string;
  /** When present, the tile links here instead of showing a "Coming next" badge. */
  href?: string;
}

export function ModuleGrid({ modules }: { modules: ModuleInfo[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {modules.map((module) => {
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-xl font-semibold text-parchment">{module.title}</h2>
              {!module.href && (
                <span className="flex-none rounded-full border border-night-border px-2.5 py-0.5 text-xs text-muted">
                  Coming next
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-muted">{module.description}</p>
          </>
        );

        const className =
          'flex flex-col gap-2 rounded-xl border border-night-border bg-night-panel p-6 transition-colors' +
          (module.href ? ' hover:border-gold/50' : '');

        return (
          <li key={module.title}>
            {module.href ? (
              <Link to={module.href} className={className}>
                {content}
              </Link>
            ) : (
              <div className={className}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
