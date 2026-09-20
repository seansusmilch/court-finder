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
  const currentUser = useQuery(api.users.me, isAuthenticated ? {} : 'skip');
  const hasAdmin = useQuery(
    api.users.hasPermission,
    isAuthenticated && currentUser ? { permission: 'admin.access' } : 'skip'
  );
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && currentUser && hasAdmin === false) {
      void navigate({
        to: '/unauthorized',
        search: { redirect: location.href, reason: 'insufficient_permissions' },
        replace: true,
      });
    }
  }, [currentUser, hasAdmin, isAuthenticated, isLoading, location.href, navigate]);

  if (isLoading || !isAuthenticated || currentUser === undefined || !currentUser || hasAdmin !== true) {
    return <Loader />;
  }
  return <Outlet />;
}
