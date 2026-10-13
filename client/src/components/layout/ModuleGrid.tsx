import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../common/icons';

export interface ModuleInfo {
  title: string;
  description: string;
  /** When present, the tile links here and renders as active instead of "Coming next". */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}

export function ModuleGrid({ modules }: { modules: ModuleInfo[] }) {
  return (
    <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      {modules.map((module, index) => {
        const Icon = module.icon;
        const isActive = Boolean(module.href);

        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <span
                className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl border transition-colors duration-200 ${
                  isActive
                    ? 'border-gold/25 bg-gold/10 text-gold group-hover:bg-gold group-hover:text-night'
                    : 'border-night-border bg-night-raised text-muted'
                }`}
              >
                {Icon && <Icon className="h-6 w-6" />}
              </span>
              {!isActive && <span className="badge-neutral">Coming next</span>}
            </div>

            <h2 className="mt-3 text-xl font-semibold text-parchment">{module.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{module.description}</p>

            {isActive && (
              <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-medium text-gold">
                Open
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            )}
          </>
        );

        const className = `group flex h-full flex-col gap-1 p-6 animate-fade-in-up ${
          isActive ? 'surface-interactive' : 'surface opacity-60'
        }`;
        const style = { animationDelay: `${index * 70}ms` };

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
