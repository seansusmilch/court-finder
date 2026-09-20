import { cn } from '@/lib/utils';
import { COURT_CLASS_VISUALS } from '@/lib/constants';
import type { LucideIcon } from 'lucide-react';
import { Activity, Circle, CircleDot, Diamond, Footprints } from 'lucide-react';

const COURT_TYPE_ICONS: Record<string, LucideIcon> = {
  'basketball-court': CircleDot,
  'tennis-court': Circle,
  'soccer-ball-field': CircleDot,
  'baseball-diamond': Diamond,
  'ground-track-field': Footprints,
};

const COURT_TYPES = Object.entries(COURT_CLASS_VISUALS).map(([key, value]) => ({
  key,
  icon: COURT_TYPE_ICONS[key] ?? Activity,
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
        'fixed top-[4.5rem] left-1/2 z-30 w-full max-w-md -translate-x-1/2 no-zoom md:top-[8rem]',
        className
      )}
    >
      <div
        className="flex items-center gap-2 overflow-x-auto px-4 pb-2 scrollbar-hide md:px-0"
        role="group"
        aria-label="Filter map by facility type"
      >
        {/* All Courts option */}
        <button
          type="button"
          onClick={() => onTypeChange(null)}
          aria-pressed={selectedType === null}
          className={cn(
            'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            selectedType === null
              ? 'border-foreground bg-foreground text-background shadow-sm'
              : 'border-border/70 bg-background/95 text-foreground shadow-sm hover:bg-muted'
          )}
        >
          <span>All courts</span>
        </button>

        {/* Court type pills */}
        {COURT_TYPES.map((type) => {
          const isSelected = selectedType === type.key;
          const Icon = type.icon;
          const label = type.displayName.toLowerCase();
          return (
            <button
              type="button"
              key={type.key}
              onClick={() => onTypeChange(isSelected ? null : type.key)}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'border-foreground bg-foreground text-background shadow-sm'
                  : 'border-border/70 bg-background/95 text-foreground shadow-sm hover:bg-muted'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
