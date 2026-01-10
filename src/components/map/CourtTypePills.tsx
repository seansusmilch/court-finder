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
        'fixed top-[4.25rem] left-1/2 -translate-x-1/2 z-40 w-full max-w-md',
        className
      )}
    >
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {/* All Courts option */}
        <button
          onClick={() => onTypeChange(null)}
          className={cn(
            'flex-shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all border ml-5',
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
                'flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-all border',
                isSelected
                  ? `${type.borderClass} ${type.bgClass} text-white shadow-sm`
                  : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              <span className="text-sm">{type.emoji}</span>
              <span>{type.displayName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
