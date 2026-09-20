import { Check, Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/components/theme-provider';

export function ModeToggle({ onChanged }: { onChanged?: () => void }) {
  const { setTheme, theme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='outline'
          size='icon'
          className='min-h-12 min-w-12 rounded-md'
          aria-label='Change color theme'
          title='Change color theme'
        >
          <Sun className='size-5 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' aria-hidden />
          <Moon className='absolute size-5 scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' aria-hidden />
          <span className='sr-only'>Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem
          onClick={() => {
            setTheme('light');
            onChanged?.();
          }}
        >
          {theme === 'light' ? <Check className='size-4' /> : <span className='size-4' />}
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme('dark');
            onChanged?.();
          }}
        >
          {theme === 'dark' ? <Check className='size-4' /> : <span className='size-4' />}
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            setTheme('system');
            onChanged?.();
          }}
        >
          {theme === 'system' ? <Check className='size-4' /> : <span className='size-4' />}
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
