import { Link, useLocation } from '@tanstack/react-router';
import { Home, Map, MessageSquare, User, type LucideIcon } from 'lucide-react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon?: LucideIcon;
  label: string;
  to: string;
  isActive: boolean;
}

function NavItem({ icon: Icon, label, to, isActive }: NavItemProps) {
  return (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'relative flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center outline-none transition-[background-color,color] duration-200 focus-visible:bg-muted focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-secondary/60 motion-reduce:transition-none',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      {Icon ? (
        <Icon
          aria-hidden='true'
          className={cn('size-5', isActive ? 'text-primary' : 'text-current')}
        />
      ) : null}
      <span className={cn('text-xs leading-none', isActive ? 'font-semibold' : 'font-medium')}>
        {label}
      </span>
      {isActive && (
        <span
          className='absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary'
          aria-hidden
        />
      )}
    </Link>
  );
}

export default function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav
      className='fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background pb-[env(safe-area-inset-bottom)] md:hidden no-zoom'
      aria-label='Mobile navigation'
    >
      <div className='mx-auto flex min-h-16 w-full max-w-lg items-stretch gap-1 px-2'>
        <NavItem
          icon={Home}
          label="Home"
          to="/"
          isActive={pathname === '/'}
        />
        <NavItem
          icon={Map}
          label="Map"
          to="/map"
          isActive={pathname.startsWith('/map')}
        />
        <Authenticated>
          <NavItem
            icon={MessageSquare}
            label="Feedback"
            to="/feedback"
            isActive={pathname.startsWith('/feedback')}
          />
          <NavItem
            icon={User}
            label="Account"
            to="/account"
            isActive={pathname.startsWith('/account')}
          />
        </Authenticated>
        <Unauthenticated>
          <NavItem
            icon={User}
            label="Login"
            to="/login"
            isActive={pathname === '/login'}
          />
        </Unauthenticated>
      </div>
    </nav>
  );
}
