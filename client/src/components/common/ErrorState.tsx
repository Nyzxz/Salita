interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-lg border border-clay/40 bg-clay/10 px-5 py-4 text-parchment"
    >
      <p>
        <span className="font-semibold text-clay">Couldn&apos;t load this. </span>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-clay/60 px-3 py-1.5 text-sm text-clay transition-colors hover:bg-clay/20"
        >
          Try again
        </button>
      )}
    </div>
  );
}
