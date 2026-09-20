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
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);
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
    if (isLoading || !isAuthenticated) {
      return;
    }

    const startTs = Date.now();
    void ensureCurrentUser({}).catch((error) => {
      console.error('user_sync_failed', {
        startTs,
        durationMs: Date.now() - startTs,
        isAuthenticated,
        error,
      });
    });
  }, [isAuthenticated, isLoading, ensureCurrentUser]);

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
