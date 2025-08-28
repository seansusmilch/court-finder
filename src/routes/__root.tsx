import Header from '@/components/header';
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
import { ConvexReactClient, useConvexAuth, useMutation } from 'convex/react';
import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { Doc } from '@backend/_generated/dataModel';
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
  const { isAuthenticated } = useConvexAuth();
  const ensureDefaults = useMutation(api.users.ensureDefaultPermissions);
  const router = useRouter();
  const location = useLocation();

  // Routes where we don't want to show the footer
  const hideFooterRoutes = ['/map', '/training-feedback'];
  const shouldHideFooter = hideFooterRoutes.includes(location.pathname);

  useEffect(() => {
    // When auth status changes (e.g., after login)
    if (isAuthenticated) {
      ensureDefaults({}).finally(() => {
        router.invalidate();
      });
    } else {
      router.invalidate();
    }
  }, [isAuthenticated, router, ensureDefaults]);

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
            shouldHideFooter
              ? 'grid-rows-[auto_1fr]'
              : 'grid-rows-[auto_1fr_auto]'
          } h-dvh`}
        >
          <Header />
          {isFetching ? <Loader /> : <Outlet />}
          {!shouldHideFooter && (
            <footer className='border-t text-sm text-muted-foreground'>
              <div className='container mx-auto px-4 py-4 flex items-center justify-between'>
                <span>© {new Date().getFullYear()} Court Finder</span>
                <nav className='flex gap-4'>
                  <Link to={'/terms'} className='hover:underline'>
                    Terms
                  </Link>
                  <Link to={'/privacy'} className='hover:underline'>
                    Privacy
                  </Link>
                </nav>
              </div>
            </footer>
          )}
        </div>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position='bottom-left' />
    </>
  );
}
