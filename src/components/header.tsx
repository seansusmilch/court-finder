import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import { Authenticated, Unauthenticated } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { MenuIcon, UserIcon } from 'lucide-react';

import { ModeToggle } from './mode-toggle';
import { NAVIGATION_LINKS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';

export default function Header() {
  const { signOut } = useAuthActions();
  const healthCheck = useQuery(api.healthCheck.get);
  return (
    <div>
      <div className='grid grid-cols-3 items-center px-4 py-2'>
        {/* Left: Logo */}
        <div className='flex items-center justify-start'>
          <Link
            to='/'
            className='flex items-center hover:opacity-90 transition-opacity'
          >
            <img
              src='/logo.webp'
              alt='Court Finder'
              className='h-8 w-auto sm:h-10'
            />
            <span className='pl-4 lg:inline font-semibold text-lg tracking-tight'>
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
              className='text-muted-foreground hover:text-foreground'
              asChild
            >
              <Link
                to={to}
                activeProps={{ className: 'bg-accent text-foreground' }}
              >
                {label}
              </Link>
            </Button>
          ))}
        </nav>

        {/* Right: Controls */}
        <div className='flex items-center justify-end gap-3'>
          <div className='hidden md:flex items-center gap-2 text-xs text-muted-foreground'>
            <div
              className={`h-2 w-2 rounded-full ${
                healthCheck === 'OK'
                  ? 'bg-green-500'
                  : healthCheck === undefined
                  ? 'bg-orange-400'
                  : 'bg-red-500'
              }`}
              title={
                healthCheck === undefined
                  ? 'Checking API…'
                  : healthCheck === 'OK'
                  ? 'API Connected'
                  : 'API Error'
              }
            />
            <span className='hidden lg:inline'>API</span>
          </div>
          <div className='hidden md:flex items-center gap-2'>
            <Authenticated>
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
            <MobileNav />
          </div>
        </div>
      </div>
      <hr />
    </div>
  );
}

import * as React from 'react';

function MobileNav() {
  const { signOut } = useAuthActions();
  const healthCheck = useQuery(api.healthCheck.get);
  const [open, setOpen] = React.useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' aria-label='Open menu'>
          <MenuIcon className='size-5' />
        </Button>
      </SheetTrigger>
      <SheetContent side='right' className='w-80 p-0'>
        <div className='p-4'>
          <SheetHeader>
            <div className='flex items-center gap-3'>
              <img src='/logo.webp' alt='Court Finder' className='h-6 w-auto' />
              <SheetTitle>Menu</SheetTitle>
            </div>
          </SheetHeader>
        </div>
        <div className='px-4 pb-4'>
          <nav className='grid gap-1'>
            {NAVIGATION_LINKS.map(({ to, label }) => (
              <Button
                key={to}
                variant='ghost'
                className='justify-start text-muted-foreground hover:text-foreground'
                asChild
              >
                <Link
                  to={to}
                  onClick={() => setOpen(false)}
                  activeProps={{ className: 'bg-accent text-foreground' }}
                >
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
        <div className='border-t p-4 text-xs text-muted-foreground'>
          <div className='flex items-center gap-2'>
            <div
              className={`h-2 w-2 rounded-full ${
                healthCheck === 'OK'
                  ? 'bg-green-500'
                  : healthCheck === undefined
                  ? 'bg-orange-400'
                  : 'bg-red-500'
              }`}
            />
            <span>
              {healthCheck === undefined
                ? 'Checking API…'
                : healthCheck === 'OK'
                ? 'API Connected'
                : 'API Error'}
            </span>
          </div>
        </div>
        <div className='border-t p-4'>
          <ModeToggle onChanged={() => setOpen(false)} />
        </div>
        <div className='border-t p-4'>
          <SheetFooter>
            <Authenticated>
              <Button
                variant='secondary'
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
              >
                Sign out
              </Button>
            </Authenticated>
            <Unauthenticated>
              <Button asChild>
                <Link to={'/login'} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
            </Unauthenticated>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
