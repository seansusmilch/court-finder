import Loader from '@/components/loader';
import { api } from '@backend/_generated/api';
import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useConvexAuth, useQuery } from 'convex/react';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authed/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const hasAdmin = useQuery(
    api.users.hasPermission,
    isAuthenticated ? { permission: 'admin.access' } : 'skip'
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && hasAdmin === false) {
      void navigate({
        to: '/unauthorized',
        search: { redirect: location.href, reason: 'insufficient_permissions' },
        replace: true,
      });
    }
  }, [hasAdmin, isAuthenticated, isLoading, location.href, navigate]);

  if (isLoading || !isAuthenticated || hasAdmin !== true) return <Loader />;
  return <Outlet />;
}
