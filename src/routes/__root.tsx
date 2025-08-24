import Header from '@/components/header';
import Loader from '@/components/loader';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import {
  HeadContent,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router';
import { api } from '@backend/api';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { ConvexReactClient, useConvexAuth } from 'convex/react';
import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { Doc } from '@backend/dataModel';
import '../index.css';

export interface RouterAppContext {
  convex: ConvexReactClient;
  me?: Doc<'users'> | null;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  beforeLoad: async ({ context }) => {
    const me = await context.convex.query(api.users.me, {});
    console.log('root before load', me);
    return { me };
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
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    // When auth status changes (e.g., after login), re-run beforeLoad to fetch fresh `me`.
    router.invalidate();
  }, [isAuthenticated, router]);

  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute='class'
        defaultTheme='dark'
        disableTransitionOnChange
        storageKey='vite-ui-theme'
      >
        <div className='grid grid-rows-[auto_1fr] h-svh'>
          <Header />
          {isFetching ? <Loader /> : <Outlet />}
        </div>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position='bottom-left' />
    </>
  );
}
