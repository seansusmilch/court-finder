import {
  createFileRoute,
  useBlocker,
  useNavigate,
} from '@tanstack/react-router';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/test')({
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  useBlocker({
    shouldBlockFn: (context) => {
      console.log('[shouldBlockFn]', context);
      const next = context.next;
      const url = new URL(window.location.href);
      url.searchParams.set('query', (next.search as any).query);
      window.history.replaceState(null, '', url.toString());
      return true;
    },
  });

  return (
    <div className='p-4 space-y-2'>
      <Input
        value={(search as any).query}
        onChange={(e) =>
          navigate({
            to: '.',
            search: (old) => ({ ...old, query: e.target.value }),
            replace: true,
            resetScroll: false,
          })
        }
        placeholder='Type to search…'
      />
      <div>Hello "/test"!</div>
    </div>
  );
}
