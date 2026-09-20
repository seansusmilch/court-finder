import { Link, useLocation } from '@tanstack/react-router';
import { Home, Map, MessageSquare, User } from 'lucide-react';
import { Authenticated, Unauthenticated } from 'convex/react';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon?: React.ComponentType<{ className?: string }>;
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
        'relative flex min-h-16 min-w-16 flex-1 flex-col items-center justify-center gap-1 px-2 py-2 outline-none transition-colors duration-200 focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary',
        isActive
          ? 'text-foreground'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
      )}
    >
      {Icon ? (
        <Icon className={cn('size-5 transition-colors', isActive && 'text-primary')} aria-hidden />
      ) : null}
      <span className='text-xs font-medium'>{label}</span>
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
      className='fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] md:hidden no-zoom'
      aria-label='Mobile navigation'
    >
      <div className='flex min-h-16 items-center justify-around'>
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
