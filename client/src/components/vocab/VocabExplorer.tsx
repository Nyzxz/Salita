import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { loadStringSet, saveStringSet } from '../../lib/localSet';
import { CATEGORY_META, type Category } from '@shared/types';
import { useWords } from '../../hooks/useWords';
import { ErrorState } from '../common/ErrorState';
import { CardGridSkeleton } from '../ui/Skeleton';
import { PageIntro } from '../ui/PageIntro';
import { CategoryTabs } from './CategoryTabs';
import { VocabCard } from './VocabCard';

export function VocabExplorer() {
  const { session } = useAuth();
  const favoritesKey = `salita.favorites.${session?.user.id ?? 'guest'}`;
  const [favorites, setFavorites] = useState<Set<string>>(() => loadStringSet(favoritesKey));
  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const categoryArg = activeCategory === 'all' ? undefined : activeCategory;
  const { data: words, isLoading, error } = useWords(categoryArg);

  const toggleFavorite = (wordId: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(wordId)) next.delete(wordId);
      else next.add(wordId);
      saveStringSet(favoritesKey, next);
      return next;
    });
  };

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (words ?? []).filter(
      (word) =>
        (!onlyFavorites || favorites.has(word.id)) &&
        (query === '' || word.word.toLowerCase().includes(query) || word.translation.toLowerCase().includes(query)),
    );
  }, [words, search, onlyFavorites, favorites]);

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

      <div className="flex flex-wrap items-center gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">Search words</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search a word or its meaning…"
            className="field"
          />
        </label>
        <button
          type="button"
          aria-pressed={onlyFavorites}
          onClick={() => setOnlyFavorites((value) => !value)}
          className={`rounded-full border px-4 py-2 text-sm transition ${onlyFavorites ? 'border-clay bg-clay/15 text-parchment' : 'border-night-border text-muted hover:text-parchment'}`}
        >
          ♥ Favourites {favorites.size > 0 ? `(${favorites.size})` : ''}
        </button>
      </div>

      {isLoading && <CardGridSkeleton />}
      {error && <ErrorState message={error} />}

      {words && !isLoading && !error && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((word) => (
            <VocabCard key={word.id} word={word} isFavorite={favorites.has(word.id)} onToggleFavorite={toggleFavorite} />
          ))}
        </div>
      )}
      {words && !isLoading && !error && shown.length === 0 && (
        <p className="text-sm text-muted">{onlyFavorites ? 'No favourites here yet — tap the heart on a word.' : 'No words match your search.'}</p>
      )}
    </section>
  );
}
