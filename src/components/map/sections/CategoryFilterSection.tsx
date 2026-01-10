import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVisualForClass } from '@/lib/constants';
import type { MapSectionConfig } from '../shared/types';

export interface CategoryFilterSectionProps {
  categories: string[];
  enabledCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  className?: string;
}

export function CategoryFilterSection({
  categories,
  enabledCategories,
  onCategoriesChange,
  className,
}: CategoryFilterSectionProps) {
  const allSelected = enabledCategories.length === categories.length;

  const toggleCategory = (cat: string) => {
    if (enabledCategories.includes(cat)) {
      onCategoriesChange(enabledCategories.filter((c) => c !== cat));
    } else {
      onCategoriesChange([...enabledCategories, cat]);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Filter className='h-4 w-4 text-muted-foreground' />
          <h3 className='font-display text-sm font-semibold tracking-tight'>
            Categories
          </h3>
        </div>
        <div className='flex gap-1.5'>
          <button
            onClick={() => onCategoriesChange(categories)}
            disabled={categories.length === 0 || allSelected}
            className='text-xs font-medium text-primary hover:text-primary/80 disabled:text-muted-foreground disabled:opacity-50 transition-colors px-2 py-1'
          >
            All
          </button>
          <span className='text-muted-foreground/40'>•</span>
          <button
            onClick={() => onCategoriesChange([])}
            disabled={enabledCategories.length === 0}
            className='text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors px-2 py-1'
          >
            Clear
          </button>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {categories.map((cat) => {
          const visual = getVisualForClass(cat);
          const isEnabled = enabledCategories.includes(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all',
                'border',
                isEnabled
                  ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
                  : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:border-border'
              )}
            >
              <span className='text-base'>{visual.emoji}</span>
              <span>{visual.displayName}</span>
              {isEnabled && (
                <X className='h-3.5 w-3.5 opacity-70' />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Creates a section config for the category filter section
 */
export function createCategoryFilterSection(
  props: CategoryFilterSectionProps
): MapSectionConfig {
  return {
    id: 'category-filter',
    order: 1,
    renderContent: () => <CategoryFilterSection {...props} />,
  };
}
