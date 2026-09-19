import Loader from '@/components/loader';
import { api } from '@backend/_generated/api';
import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';

export const Route = createFileRoute('/_authed/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const hasAdmin = useQuery(api.users.hasPermission, { permission: 'admin.access' });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (hasAdmin === false) {
      void navigate({
        to: '/unauthorized',
        search: { redirect: location.href, reason: 'insufficient_permissions' },
        replace: true,
      });
    }
  }, [hasAdmin, location.href, navigate]);

  if (hasAdmin !== true) return <Loader />;
  return <Outlet />;
}
