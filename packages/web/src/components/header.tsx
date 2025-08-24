import { Link } from '@tanstack/react-router';
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
  return (
    <div>
      <div className='flex flex-row items-center justify-between px-2 py-2'>
        <div className='flex items-center gap-3'>
          <nav className='hidden md:flex gap-4 text-sm'>
            {NAVIGATION_LINKS.map(({ to, label }) => (
              <Link key={to} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className='flex items-center gap-2'>
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
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
        </div>
        <div className='px-4 pb-4'>
          <nav className='grid gap-1'>
            {NAVIGATION_LINKS.map(({ to, label }) => (
              <Button
                key={to}
                variant='ghost'
                className='justify-start'
                asChild
              >
                <Link to={to} onClick={() => setOpen(false)}>
                  {label}
                </Link>
              </Button>
            ))}
          </nav>
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
