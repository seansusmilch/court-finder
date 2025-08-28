import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Input } from '@/components/ui/input';

export const Route = createFileRoute('/test')({
  component: RouteComponent,
});

function RouteComponent() {
  const search = Route.useSearch<{ query?: string }>();
  const navigate = useNavigate({ from: Route.fullPath });

  return (
    <div className='p-4 space-y-2'>
      <Input
        value={search.query ?? ''}
        onChange={(e) =>
          navigate({
            to: '.',
            search: (old) => ({ ...(old as { query?: string }), query: e.target.value }),
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
