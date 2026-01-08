import { Link, useLocation } from '@tanstack/react-router';
import { Home, Map, MessageSquare, User } from 'lucide-react';
import { Authenticated, Unauthenticated, useQuery } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { cn } from '@/lib/utils';

interface NavItemProps {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  to: string;
  isActive: boolean;
  profileImageUrl?: string | null;
}

function NavItem({ icon: Icon, label, to, isActive, profileImageUrl }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] transition-all duration-200',
        isActive
          ? 'text-primary scale-105'
          : 'text-muted-foreground hover:text-foreground'
      )}
      activeProps={{ className: 'text-primary scale-105' }}
    >
      {profileImageUrl ? (
        <img
          src={profileImageUrl}
          alt="Profile"
          className={cn(
            'h-6 w-6 rounded-full object-cover border-2 transition-all',
            isActive ? 'border-primary shadow-lg' : 'border-border'
          )}
        />
      ) : Icon ? (
        <Icon className={cn('h-6 w-6 transition-transform', isActive && 'text-primary scale-110')} />
      ) : null}
      <span className="text-xs font-medium">{label}</span>
      {isActive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full shadow-[0_0_8px_currentColor]" />
      )}
    </Link>
  );
}

function AccountNavItem() {
  const location = useLocation();
  const pathname = location.pathname;
  const profileImageUrl = useQuery(api.users.getProfileImageUrl, {});

  return (
    <NavItem
      icon={User}
      label="Account"
      to="/account"
      isActive={pathname === '/account'}
      profileImageUrl={profileImageUrl}
    />
  );
}

export default function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur-sm border-t md:hidden z-50 safe-area-inset-bottom">
      <div className="flex justify-around items-center h-16">
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
        </Authenticated>
        <Unauthenticated>
          <NavItem
            icon={User}
            label="Login"
            to="/login"
            isActive={pathname === '/login'}
          />
        </Unauthenticated>
        <Authenticated>
          <AccountNavItem />
        </Authenticated>
      </div>
    </nav>
  );
}
