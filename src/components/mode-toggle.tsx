import { Monitor, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ModeToggle({ onChanged }: { onChanged?: () => void }) {
  const { setTheme, theme } = useTheme();
  const currentTheme = theme ?? 'system';
  const currentThemeLabel =
    themeOptions.find((option) => option.value === currentTheme)?.label ?? 'System';

  const handleThemeChange = (nextTheme: string) => {
    setTheme(nextTheme);
    onChanged?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='relative h-12 w-12 rounded-lg border-border/80 bg-background shadow-[0_2px_8px_rgba(0,0,0,0.12)] hover:scale-100 hover:border-primary/50 hover:bg-muted active:scale-100 focus-visible:ring-[3px] focus-visible:ring-secondary/60 motion-reduce:transition-none dark:bg-card'
          aria-label='Choose color theme'
          title={`Color theme: ${currentThemeLabel}`}
        >
          <span className='relative grid size-5 place-items-center'>
            <Sun className='size-5 scale-100 rotate-0 transition-[opacity,transform] dark:scale-0 dark:-rotate-90 dark:opacity-0 motion-reduce:transition-none' aria-hidden='true' />
            <Moon className='absolute size-5 scale-0 rotate-90 opacity-0 transition-[opacity,transform] dark:scale-100 dark:rotate-0 dark:opacity-100 motion-reduce:transition-none' aria-hidden='true' />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        sideOffset={8}
        className='min-w-48 rounded-xl border-border/80 bg-popover/98 p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.18)]'
      >
        <DropdownMenuLabel className='px-3 pb-1.5 pt-1 text-xs font-semibold tracking-[0.08em] text-muted-foreground'>
          Color theme
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentTheme} onValueChange={handleThemeChange}>
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem
              key={value}
              value={value}
              className='min-h-12 rounded-lg px-3 py-2 pl-10 text-sm transition-colors focus:bg-muted focus:text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:font-medium data-[state=checked]:text-foreground hover:bg-muted dark:data-[state=checked]:bg-primary/15'
            >
              <Icon className='size-4 text-muted-foreground' aria-hidden='true' />
              <span>{label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
