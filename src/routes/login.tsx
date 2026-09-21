import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { SignIn, useAuth } from '@clerk/react';
import { useEffect } from 'react';

export const Route = createFileRoute('/login')({
  validateSearch: (s: { redirect?: string }) => s,
  component: AuthPage,
});

function getSafeRedirect(redirectTo?: string) {
  if (!redirectTo) return '/';

  try {
    const url = new URL(redirectTo, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return url.pathname + url.search + url.hash;
  } catch (_) {
    return '/';
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const { redirect: redirectTo } = Route.useSearch();
  const safeRedirectTo = getSafeRedirect(redirectTo);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn) {
      navigate({ to: safeRedirectTo });
    }
  }, [isLoaded, isSignedIn, navigate, safeRedirectTo]);

  return (
    <div className='flex min-h-[calc(100dvh-0px)] items-center justify-center p-4'>
      <SignIn routing='hash' forceRedirectUrl={safeRedirectTo} />
    </div>
  );
}
