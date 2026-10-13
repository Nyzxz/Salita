import { useMemo, useState } from 'react';
import { CATEGORY_META, type Category } from '@shared/types';
import { useWords } from '../../hooks/useWords';
import { ErrorState } from '../common/ErrorState';
import { CardGridSkeleton } from '../ui/Skeleton';
import { PageIntro } from '../ui/PageIntro';
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
      <PageIntro
        id="explore-heading"
        eyebrow="Vocabulary"
        title="Vocabulary & etymology"
        description={activeMeta ? activeMeta.description : 'Every word here comes with the story behind it.'}
      />

      <CategoryTabs categories={CATEGORY_META} active={activeCategory} onChange={setActiveCategory} />

      {isLoading && <CardGridSkeleton />}
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
