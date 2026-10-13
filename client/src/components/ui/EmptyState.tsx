import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-night-border bg-night-panel/40 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-night-border bg-night-raised text-gold-soft [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </span>
      <p className="mt-4 font-display text-lg font-semibold text-parchment">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
