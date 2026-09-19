import Loader from '@/components/loader';
import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authed')({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({
        to: '/login',
        search: { redirect: location.href },
        replace: true,
      });
    }
  }, [isAuthenticated, isLoading, location.href, navigate]);

  if (isLoading || !isAuthenticated) return <Loader />;
  return <Outlet />;
}
