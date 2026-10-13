import { AlertIcon } from './icons';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-2xl border border-clay/35 bg-clay/10 p-5 text-parchment sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <AlertIcon className="mt-0.5 h-5 w-5 flex-none text-clay" />
        <div>
          <p className="font-semibold">Couldn&apos;t load this</p>
          <p className="mt-0.5 text-sm text-muted">{message}</p>
        </div>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-danger btn-sm flex-none">
          Try again
        </button>
      )}
    </div>
  );
}
