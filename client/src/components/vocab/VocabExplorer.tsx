import { useMemo, useState } from 'react';
import { CATEGORY_META, type Category } from '@shared/types';
import { useWords } from '../../hooks/useWords';
import { ErrorState } from '../common/ErrorState';
import { LoadingState } from '../common/LoadingState';
import { CategoryTabs } from './CategoryTabs';
import { VocabCard } from './VocabCard';

export function VocabExplorer() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const categoryArg = activeCategory === 'all' ? undefined : activeCategory;
  const { data: words, isLoading, error } = useWords(categoryArg);

  const activeMeta = useMemo(
    () => CATEGORY_META.find((meta) => meta.id === activeCategory),
    [activeCategory],
  );

  return (
    <section aria-labelledby="explore-heading" className="flex flex-col gap-6">
      <div>
        <h2 id="explore-heading" className="font-display text-2xl font-semibold text-parchment">
          Vocabulary &amp; etymology
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          {activeMeta ? activeMeta.description : 'Every word here comes with the story behind it.'}
        </p>
      </div>

      <CategoryTabs categories={CATEGORY_META} active={activeCategory} onChange={setActiveCategory} />

      {isLoading && <LoadingState label="Loading vocabulary…" />}
      {error && <ErrorState message={error} />}

      {words && !isLoading && !error && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {words.map((word) => (
            <VocabCard key={word.id} word={word} />
          ))}
        </div>
      )}
    </section>
  );
}
