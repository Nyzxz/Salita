import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon } from '../common/icons';

export interface ModuleInfo {
  title: string;
  description: string;
  /** When present, the tile links here and renders as active instead of "Coming next". */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export function ModuleGrid({ modules }: { modules: ModuleInfo[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {modules.map((module, index) => {
        const Icon = module.icon;
        const isActive = Boolean(module.href);

        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-lg ${
                  isActive ? 'bg-gold/15 text-gold' : 'bg-night-raised text-muted'
                }`}
              >
                {Icon && <Icon className="h-5 w-5" />}
              </span>
              {!isActive && (
                <span className="flex-none rounded-full border border-night-border px-2.5 py-0.5 text-xs text-muted">
                  Coming next
                </span>
              )}
            </div>

            <h2 className="mt-1 font-display text-xl font-semibold text-parchment">{module.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{module.description}</p>

            {isActive && (
              <span className="mt-auto flex items-center gap-1 pt-2 text-sm font-medium text-gold">
                Open
                <ChevronRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            )}
          </>
        );

        const className = `group flex h-full flex-col gap-2 rounded-xl border p-6 transition-all duration-200 animate-fade-in-up ${
          isActive
            ? 'border-night-border bg-night-panel hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-lg hover:shadow-black/20'
            : 'border-night-border/60 bg-night-panel/50'
        }`;
        const style = { animationDelay: `${index * 60}ms` };

        return (
          <li key={module.title} style={style}>
            {isActive ? (
              <Link to={module.href!} className={className}>
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
