import { useMemo } from 'react';
import { useMilestones } from '../../hooks/useMilestones';
import { useWords } from '../../hooks/useWords';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { MilestoneCard } from './MilestoneCard';

export function Timeline() {
  const { data: milestones, isLoading: milestonesLoading, error: milestonesError } = useMilestones();
  const { data: words, isLoading: wordsLoading, error: wordsError } = useWords();

  const wordLabelById = useMemo(() => {
    const map = new Map<string, string>();
    words?.forEach((word) => map.set(word.id, word.word));
    return map;
  }, [words]);

  const isLoading = milestonesLoading || wordsLoading;
  const error = milestonesError ?? wordsError;

  return (
    <section aria-labelledby="timeline-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="timeline-heading" className="font-display text-2xl font-semibold text-parchment">
          How the language got here
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Six hundred years of trade, colonization, and invention, compressed into five stops.
        </p>
      </div>

      {isLoading && <LoadingState label="Loading timeline…" />}
      {error && <ErrorState message={error} />}

      {milestones && !isLoading && !error && (
        <ol className="mt-2">
          {milestones.map((milestone, index) => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              isLast={index === milestones.length - 1}
              relatedWords={milestone.keyWordsIntroduced
                .map((id) => wordLabelById.get(id))
                .filter((label): label is string => Boolean(label))}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
