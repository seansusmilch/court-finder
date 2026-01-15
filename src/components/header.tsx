import { Link } from '@tanstack/react-router';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { UserIcon } from 'lucide-react';

import { ModeToggle } from './mode-toggle';
import { NAVIGATION_LINKS } from '@/lib/constants';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { signOut } = useAuthActions();
  return (
    <div className='sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b no-zoom'>
      <div className='grid grid-cols-2 md:grid-cols-3 items-center px-4 py-2'>
        {/* Left: Logo */}
        <div className='flex items-center justify-start'>
          <Link
            to='/'
            className='flex items-center hover:opacity-90 transition-opacity duration-200'
          >
            <img
              src='/logo.webp'
              alt='Court Finder'
              className='p-0.5 md:p-1 h-8 w-auto sm:h-10'
            />
            <span className='pl-4 font-semibold text-lg tracking-tight font-display'>
              Court Finder
            </span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav className='hidden md:flex gap-1 justify-center'>
          {NAVIGATION_LINKS.map(({ to, label }) => (
            <Button
              key={to}
              variant='ghost'
              size='sm'
              className='text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors'
              asChild
            >
              <Link
                to={to}
                activeProps={{ className: 'bg-accent text-foreground shadow-sm' }}
              >
                {label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right: Controls */}
        <div className='flex items-center justify-end gap-3'>
          <div className='hidden md:flex items-center gap-2'>
            <Authenticated>
              <Button variant='ghost' size='sm' asChild>
                <Link to='/account'>
                  <UserIcon className='mr-2 size-4' /> Account
                </Link>
              </Button>
              <Button variant='ghost' size='sm' onClick={() => signOut()}>
                Sign out
              </Button>
            </Authenticated>
            <Unauthenticated>
              <Button asChild size='sm'>
                <Link to={'/login'}>
                  <UserIcon className='mr-2 size-4' /> Sign in
                </Link>
              </Button>
            </Unauthenticated>
            <ModeToggle />
          </div>
          <div className='md:hidden'>
            <ModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
