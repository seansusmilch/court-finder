import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';

export function ModeToggle({ onChanged }: { onChanged?: () => void }) {
  const { setTheme, theme } = useTheme();
  const currentTheme = theme ?? 'system';

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
          className='relative h-12 w-12 rounded-lg shadow-none hover:scale-100 hover:bg-muted active:scale-100 focus-visible:ring-[3px] focus-visible:ring-secondary/60 motion-reduce:transition-none'
          aria-label='Choose color theme'
          title='Choose color theme'
        >
          <span className='relative grid size-5 place-items-center'>
            <Sun className='size-5 scale-100 rotate-0 transition-[opacity,transform] dark:scale-0 dark:-rotate-90 dark:opacity-0 motion-reduce:transition-none' aria-hidden='true' />
            <Moon className='absolute size-5 scale-0 rotate-90 opacity-0 transition-[opacity,transform] dark:scale-100 dark:rotate-0 dark:opacity-100 motion-reduce:transition-none' aria-hidden='true' />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='end'
        className='rounded-lg border-border/80 p-1 shadow-[0_4px_16px_rgba(0,0,0,0.16)]'
      >
        <DropdownMenuRadioGroup value={currentTheme} onValueChange={handleThemeChange}>
          <DropdownMenuRadioItem value='light' className='min-h-12 rounded-md px-3'>
          Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value='dark' className='min-h-12 rounded-md px-3'>
          Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value='system' className='min-h-12 rounded-md px-3'>
          System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
