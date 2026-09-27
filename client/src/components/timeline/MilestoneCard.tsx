import type { LanguageMilestone } from '@shared/types';

interface MilestoneCardProps {
  milestone: LanguageMilestone;
  relatedWords: string[];
  isLast: boolean;
}

export function MilestoneCard({ milestone, relatedWords, isLast }: MilestoneCardProps) {
  return (
    <li className="relative flex gap-6 pb-10">
      {!isLast && (
        <span
          aria-hidden="true"
          className="timeline-spine absolute left-[7px] top-4 h-full w-px"
        />
      )}
      <span
        aria-hidden="true"
        className="relative mt-1.5 h-4 w-4 flex-none rounded-full border-2 border-gold bg-night"
      />

      <div className="flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-gold-soft">
          {milestone.era}
        </p>
        <h3 className="mt-1 font-display text-xl font-semibold text-parchment">
          {milestone.title}
        </h3>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
          {milestone.description}
        </p>

        {relatedWords.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {relatedWords.map((word) => (
              <span
                key={word}
                className="rounded-full border border-night-border px-3 py-1 text-xs text-muted"
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}
