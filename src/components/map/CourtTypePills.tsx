import { cn } from '@/lib/utils';
import { COURT_CLASS_VISUALS } from '@/lib/constants';
import { getSportIconName, SportIcon } from './sport-icons';
import { useTheme } from '@/components/theme-provider';

const COURT_TYPES = Object.entries(COURT_CLASS_VISUALS).map(([key, value]) => ({
  key,
  iconName: getSportIconName(key),
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
  const { theme, systemTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');

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
          const label = type.displayName.toLowerCase();
          const sportColor = isDark ? type.colorDark : type.colorLight;
          return (
            <button
              type="button"
              key={type.key}
              onClick={() => onTypeChange(isSelected ? null : type.key)}
              aria-pressed={isSelected}
              className={cn(
                'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-[background-color,border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                isSelected
                  ? 'text-primary-foreground shadow-sm'
                  : 'border-border/70 bg-background/95 text-foreground shadow-sm hover:bg-muted'
              )}
              style={
                isSelected
                  ? { borderColor: sportColor, backgroundColor: sportColor }
                  : undefined
              }
            >
              <SportIcon
                name={type.iconName}
                className={cn('size-5 shrink-0', isSelected ? 'text-primary-foreground' : undefined)}
                style={isSelected ? undefined : { color: sportColor }}
              />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
