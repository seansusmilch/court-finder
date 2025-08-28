import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/_authed' as const)({
  beforeLoad: async ({ context, location }) => {
    if (!context.me) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      });
    }
  },
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}
