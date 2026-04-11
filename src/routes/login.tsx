import {
  createFileRoute,
  redirect,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { SignIn, useAuth } from '@clerk/react';
import { useEffect } from 'react';

export const Route = createFileRoute('/login')({
  validateSearch: (s: { redirect?: string }) => s,
  beforeLoad: async ({ context }) => {
    if (context.me) throw redirect({ to: '/' });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { redirect: redirectTo } = Route.useSearch();

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      let to: string = '/';
      if (redirectTo && typeof redirectTo === 'string') {
        try {
          const url = new URL(redirectTo, window.location.origin);
          if (url.origin === window.location.origin)
            to = url.pathname + url.search + url.hash;
        } catch (_) {
          // ignore malformed redirect
        }
      }
      navigate({ to });
    }
  }, [isLoaded, isSignedIn, navigate, redirectTo]);

  return (
    <div className='flex min-h-[calc(100dvh-0px)] items-center justify-center p-4'>
      <SignIn />
    </div>
  );
}
