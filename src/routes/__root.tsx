import Header from '@/components/header';
import BottomNav from '@/components/bottom-nav';
import Loader from '@/components/loader';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
  Link,
  useLocation,
} from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ConvexReactClient, useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { Doc } from '@backend/_generated/dataModel';
import { useAuth } from '@clerk/react';
import '../index.css';

export interface RouterAppContext {
  convex: ConvexReactClient;
  me?: Doc<'users'> | null;
  hasPermission: (permission: string) => Promise<boolean>;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  beforeLoad: async ({ context }) => {
    const me = await context.convex.query(api.users.me, {});
    return {
      me,
      hasPermission: (permission: string) => {
        if (!me) return false;
        return me.permissions.includes(permission);
      },
    };
  },
  head: () => ({
    meta: [
      {
        title: 'court-finder',
      },
      {
        name: 'description',
        content: 'court-finder is a web application',
      },
    ],
    links: [
      {
        rel: 'icon',
        href: '/favicon.ico',
      },
    ],
  }),
});

function RootComponent() {
  const isFetching = useRouterState({
    select: (s) => s.isLoading,
  });
  const { isLoaded, isSignedIn } = useAuth();
  const ensureDefaults = useMutation(api.users.ensureDefaultPermissions);
  const router = useRouter();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Routes where we don't want to show the header (only on mobile)
  const hideHeaderRoutes = ['/map', '/training-feedback'];
  const shouldHideHeader = isMobile && hideHeaderRoutes.includes(location.pathname);
  // Routes where we don't want scrolling on desktop
  const noScrollRoutes = ['/map'];
  const isMapRoute = noScrollRoutes.includes(location.pathname);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    // When auth status changes (e.g., after login)
    if (isSignedIn) {
      ensureDefaults({}).finally(() => {
        router.invalidate();
      });
    } else {
      router.invalidate();
    }
  }, [isLoaded, isSignedIn, router, ensureDefaults]);

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute='class'
        defaultTheme='dark'
        disableTransitionOnChange
        storageKey='vite-ui-theme'
      >
        <div
          className={`grid ${
            isMapRoute
              ? 'grid-rows-[auto_1fr_auto] md:grid-rows-[1fr_auto]'
              : shouldHideHeader
              ? 'grid-rows-[1fr_auto]'
              : 'grid-rows-[auto_1fr_auto]'
          } h-dvh`}
        >
          {!shouldHideHeader && <Header />}
          <main className={`pb-16 md:pb-0 ${isMapRoute ? 'overflow-hidden' : 'overflow-auto'}`}>
            {isFetching ? <Loader /> : <Outlet />}
          </main>
          <BottomNav />
        </div>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position='bottom-left' />
    </>
  );
}
