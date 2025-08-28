import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import type { RouterAppContext } from './__root';

export const Route = createFileRoute('/_authed' as const)({
  beforeLoad: async ({ context, location }) => {
    if (!(context as RouterAppContext).me) {
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
