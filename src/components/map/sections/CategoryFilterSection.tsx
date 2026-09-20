import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVisualForClass } from '@/lib/constants';
import type { MapSectionConfig } from '../shared/types';
import { useTheme } from '@/components/theme-provider';

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
  const { theme, systemTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
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
            type='button'
            onClick={() => onCategoriesChange(categories)}
            disabled={categories.length === 0 || allSelected}
            className='min-h-11 px-2 text-xs font-medium text-primary transition-colors hover:text-primary/80 disabled:text-muted-foreground disabled:opacity-50'
          >
            All
          </button>
          <span className='text-muted-foreground/40'>•</span>
          <button
            type='button'
            onClick={() => onCategoriesChange([])}
            disabled={enabledCategories.length === 0}
            className='min-h-11 px-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50'
          >
            Clear
          </button>
        </div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {categories.map((cat) => {
          const visual = getVisualForClass(cat);
          const isEnabled = enabledCategories.includes(cat);
          const sportColor = isDark ? visual.colorDark : visual.colorLight;
          return (
            <button
              key={cat}
              type='button'
              onClick={() => toggleCategory(cat)}
              aria-pressed={isEnabled}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors',
                'border',
                isEnabled
                  ? 'text-primary-foreground shadow-sm'
                  : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:border-border'
              )}
              style={
                isEnabled
                  ? { backgroundColor: sportColor, borderColor: sportColor }
                  : undefined
              }
            >
              <span
                className='text-base leading-none'
                style={isEnabled ? undefined : { color: sportColor }}
                aria-hidden='true'
              >
                {visual.emoji}
              </span>
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
