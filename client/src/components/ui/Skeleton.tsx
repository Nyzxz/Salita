export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** A grid of card-shaped placeholders shown while content loads. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading" className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="surface flex flex-col gap-3 p-6">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="mt-2 h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      ))}
    </div>
  );
}
