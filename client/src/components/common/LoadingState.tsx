import { CardGridSkeleton } from '../ui/Skeleton';

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = 'Loading…' }: LoadingStateProps) {
  return (
    <div role="status" className="flex flex-col gap-4">
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-2.5 text-sm text-muted">
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-night-border border-t-gold"
        />
        {label}
      </div>
      <CardGridSkeleton count={3} />
    </div>
  );
}
