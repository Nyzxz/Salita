import { Link } from 'react-router-dom';

interface BrandProps {
  to?: string;
  className?: string;
}

/** Salita wordmark with a small gold sun-ray mark. */
export function Brand({ to = '/', className = '' }: BrandProps) {
  return (
    <Link to={to} className={`group inline-flex items-center gap-2.5 ${className}`} aria-label="Salita home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-gold-soft to-gold text-night shadow-glow transition-transform duration-300 group-hover:rotate-12">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="3.2" fill="currentColor" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        </svg>
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-parchment">Salita</span>
    </Link>
  );
}
