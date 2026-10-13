import type { Category, CategoryMeta } from '@shared/types';

interface CategoryTabsProps {
  categories: readonly CategoryMeta[];
  active: Category | 'all';
  onChange: (category: Category | 'all') => void;
}

const base = 'rounded-full border px-4 py-1.5 text-sm font-medium transition duration-150';
const on = 'border-gold bg-gold/15 text-gold-soft';
const off = 'border-night-border text-muted hover:border-gold/40 hover:text-parchment';

export function CategoryTabs({ categories, active, onChange }: CategoryTabsProps) {
  return (
    <div role="tablist" aria-label="Vocabulary category" className="flex flex-wrap gap-2">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        onClick={() => onChange('all')}
        className={`${base} ${active === 'all' ? on : off}`}
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
            className={`${base} ${isActive ? on : off}`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
