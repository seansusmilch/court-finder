import { Link, useLocation } from '@tanstack/react-router';
import { Show, UserButton } from '@clerk/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { Settings, UserIcon } from 'lucide-react';

import { ModeToggle } from './mode-toggle';
import { api } from '@backend/_generated/api';
import { NAVIGATION_LINKS } from '@/lib/constants';
import { Button } from '@/components/ui/button';

export default function Header() {
  const location = useLocation();
  const { isAuthenticated } = useConvexAuth();
  const hasAdminAccess = useQuery(
    api.users.hasPermission,
    isAuthenticated ? { permission: 'admin.access' } : 'skip'
  );
  const isLoginRoute = location.pathname === '/login';
  const visibleNavigationLinks = NAVIGATION_LINKS.filter(({ to }) => {
    if (to === '/admin') return hasAdminAccess === true;
    return true;
  });

  return (
    <header className='sticky top-0 z-50 border-b border-border/70 bg-background/95 no-zoom'>
      <div className='mx-auto grid min-h-16 w-full max-w-screen-2xl grid-cols-[1fr_auto] items-center gap-4 px-4 md:grid-cols-[1fr_auto_1fr] md:px-6 lg:px-8'>
        {/* Left: Logo */}
        <div className='flex items-center justify-start'>
          <Link
            to='/'
            aria-label='Court Finder home'
            className='flex min-h-12 items-center gap-3 rounded-lg pr-3 transition-opacity duration-200 hover:opacity-85 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-secondary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none'
          >
            <img
              src='/logo.webp'
              alt='Court Finder'
              className='h-9 w-auto p-0.5 md:h-10'
            />
            <span className='hidden text-base font-semibold tracking-tight sm:inline'>
              Court Finder
            </span>
          </Link>
        </div>

        {/* Center: Navigation */}
        <nav
          className='hidden items-center justify-center gap-1 rounded-lg border border-border/60 bg-muted/40 p-1 md:flex'
          aria-label='Primary navigation'
        >
          {visibleNavigationLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              aria-label={
                to === '/map'
                  ? 'Find a facility'
                  : to === '/feedback'
                    ? 'Review possible facilities'
                    : label
              }
              activeProps={{
                'aria-current': 'page',
                className: 'bg-background text-foreground shadow-sm after:opacity-100',
              }}
              className='relative inline-flex min-h-12 items-center rounded-md px-4 text-sm font-medium text-muted-foreground outline-none transition-[background-color,color,box-shadow] after:absolute after:bottom-1.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-primary after:opacity-0 after:transition-opacity hover:bg-background/70 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-secondary/60 focus-visible:ring-offset-0 motion-reduce:transition-none'
            >
              {to === '/map' ? 'Explore' : to === '/feedback' ? 'Review' : label}
            </Link>
          ))}
        </nav>

        {/* Right: Controls */}
        <div className='flex items-center justify-end gap-2'>
          <Show when='signed-in'>
            <div className='flex size-12 items-center justify-center rounded-lg focus-within:ring-[3px] focus-within:ring-secondary/60 focus-within:ring-offset-2 focus-within:ring-offset-background'>
              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Link
                    href='/account'
                    label='Court Finder account'
                    labelIcon={<Settings className='size-4' />}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          </Show>
          {!isLoginRoute && (
            <Show when='signed-out'>
              <Button
                asChild
                className='h-12 rounded-lg px-4 shadow-sm hover:scale-100 hover:shadow-sm active:scale-100 motion-reduce:transition-none'
              >
                <Link to='/login'>
                  <UserIcon className='mr-2 size-4' /> Sign in
                </Link>
              </Button>
            </Show>
          )}
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
