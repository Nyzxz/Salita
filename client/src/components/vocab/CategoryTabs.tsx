import type { Category, CategoryMeta } from '@shared/types';

interface CategoryTabsProps {
  categories: readonly CategoryMeta[];
  active: Category | 'all';
  onChange: (category: Category | 'all') => void;
}

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div role="tablist" aria-label="Vocabulary category" className="flex flex-wrap gap-2">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        onClick={() => onChange('all')}
        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
          active === 'all'
            ? 'border-gold bg-gold text-night'
            : 'border-night-border text-muted hover:text-parchment'
        }`}
      >
        All words
      </button>
      {categories.map((category) => {
        const isActive = active === category.id;
        return (
          <button
            key={category.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            title={category.description}
            onClick={() => onChange(category.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-gold bg-gold text-night'
                : 'border-night-border text-muted hover:text-parchment'
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
