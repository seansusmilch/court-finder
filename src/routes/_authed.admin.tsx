import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: ({ context, location }) => {
    const hasAdmin = !!context.me?.permissions?.includes('admin.access');
    if (!hasAdmin) {
      throw redirect({
        to: '/unauthorized',
        search: { redirect: location.href, reason: 'insufficient_permissions' },
      });
    }
  },
  component: () => <Outlet />,
});
