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
  useLocation,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useState } from 'react';
import { api } from '@backend/_generated/api';
import '../index.css';

export interface RouterAppContext {
  convex: ConvexReactClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
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
  const { isAuthenticated, isLoading } = useConvexAuth();
  const ensureDefaults = useMutation(api.users.ensureDefaultPermissions);
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    const handleResize = () => checkMobile();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // The map owns the viewport on every device. Keep the desktop header in the
  // layout, but let the map itself occupy the remaining height.
  const hideHeaderRoutes = ['/map', '/training-feedback'];
  const shouldHideHeader = isMobile && hideHeaderRoutes.includes(location.pathname);
  const noScrollRoutes = ['/map'];
  const isMapRoute = noScrollRoutes.includes(location.pathname);

  const gridRows = isMapRoute
    ? shouldHideHeader
      ? 'grid-rows-[1fr]'
      : 'grid-rows-[auto_1fr]'
    : shouldHideHeader
      ? 'grid-rows-[1fr]'
      : 'grid-rows-[auto_1fr_auto]';

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    const startTs = Date.now();
    void ensureDefaults({}).catch((error) => {
      console.error('user_sync_failed', {
        startTs,
        durationMs: Date.now() - startTs,
        isAuthenticated,
        error,
      });
    });
  }, [isAuthenticated, isLoading, ensureDefaults]);

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
          className={`grid ${gridRows} h-dvh`}
        >
          {!shouldHideHeader && <Header />}
          <main
            className={`min-h-0 ${
              isMapRoute ? 'overflow-hidden pb-0' : 'overflow-auto pb-16 md:pb-0'
            }`}
          >
            {isFetching ? <Loader /> : <Outlet />}
          </main>
          <BottomNav />
        </div>
        <Toaster richColors />
      </ThemeProvider>
      {import.meta.env.DEV && <TanStackRouterDevtools position='bottom-left' />}
    </>
  );
}
