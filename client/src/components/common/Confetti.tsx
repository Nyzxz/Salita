import { useMemo } from 'react';

const COLORS = ['#e8a93c', '#6fbf8e', '#d9674f', '#f3e9d2'];

/** A one-off burst of falling pieces. Skipped for people who prefer reduced motion. */
export function Confetti({ pieces = 36 }: { pieces?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: pieces }, (_, index) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.8 + Math.random() * 1.4,
        size: 6 + Math.random() * 6,
        color: COLORS[index % COLORS.length],
        drift: (Math.random() - 0.5) * 120,
      })),
    [pieces],
  );
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-full overflow-hidden">
      <style>{`@keyframes salita-fall { from { transform: translate(0,-20px) rotate(0); opacity: 1 } to { transform: translate(var(--drift), 420px) rotate(540deg); opacity: 0 } }`}</style>
      {items.map((item, index) => (
        <span
          key={index}
          style={{
            position: 'absolute',
            top: 0,
            left: `${item.left}%`,
            width: item.size,
            height: item.size * 0.6,
            background: item.color,
            borderRadius: 2,
            animation: `salita-fall ${item.duration}s ease-in ${item.delay}s forwards`,
            ['--drift' as string]: `${item.drift}px`,
          }}
        />
      ))}
    </div>
  );
}
