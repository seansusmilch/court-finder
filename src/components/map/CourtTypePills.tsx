import { cn } from '@/lib/utils';
import { COURT_CLASS_VISUALS } from '@/lib/constants';

const COURT_TYPES = Object.entries(COURT_CLASS_VISUALS).map(([key, value]) => ({
  key,
  ...value,
}));

export interface CourtTypePillsProps {
  selectedType: string | null;
  onTypeChange: (type: string | null) => void;
  className?: string;
}

export function CourtTypePills({
  selectedType,
  onTypeChange,
  className,
}: CourtTypePillsProps) {
  return (
    <div
      className={cn(
        'fixed top-[4.5rem] left-1/2 -translate-x-1/2 z-40 w-full max-w-md no-zoom',
        className
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide pl-[5%] pr-[5%]">
        {/* All Courts option */}
        <button
          onClick={() => onTypeChange(null)}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition-all border',
            selectedType === null
              ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
          )}
        >
          <span>All Courts</span>
        </button>

        {/* Court type pills */}
        {COURT_TYPES.map((type) => {
          const isSelected = selectedType === type.key;
          return (
            <button
              key={type.key}
              onClick={() => onTypeChange(isSelected ? null : type.key)}
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-all border',
                isSelected
                  ? `${type.borderClass} ${type.bgClass} text-white shadow-sm`
                  : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="text-base">{type.emoji}</span>
              <span>{type.displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
