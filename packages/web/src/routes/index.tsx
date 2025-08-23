import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

const TITLE_TEXT = `
 ██████╗ ███████╗████████╗████████╗███████╗██████╗
 ██╔══██╗██╔════╝╚══██╔══╝╚══██╔══╝██╔════╝██╔══██╗
 ██████╔╝█████╗     ██║      ██║   █████╗  ██████╔╝
 ██╔══██╗██╔══╝     ██║      ██║   ██╔══╝  ██╔══██╗
 ██████╔╝███████╗   ██║      ██║   ███████╗██║  ██║
 ╚═════╝ ╚══════╝   ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝

 ████████╗    ███████╗████████╗ █████╗  ██████╗██╗  ██╗
 ╚══██╔══╝    ██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
    ██║       ███████╗   ██║   ███████║██║     █████╔╝
    ██║       ╚════██║   ██║   ██╔══██║██║     ██╔═██╗
    ██║       ███████║   ██║   ██║  ██║╚██████╗██║  ██╗
    ╚═╝       ╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝
 `;

function HomeComponent() {
  const healthCheck = useQuery(api.healthCheck.get);
  const { signOut } = useAuthActions();
  return (
    <div className='container mx-auto max-w-3xl px-4 py-2'>
      <pre className='overflow-x-auto font-mono text-sm'>{TITLE_TEXT}</pre>
      <div className='grid gap-6'>
        <section className='rounded-lg border p-4'>
          <h2 className='mb-2 font-medium'>API Status</h2>
          <div className='flex items-center gap-2'>
            <div
              className={`h-2 w-2 rounded-full ${
                healthCheck === 'OK'
                  ? 'bg-green-500'
                  : healthCheck === undefined
                  ? 'bg-orange-400'
                  : 'bg-red-500'
              }`}
            />
            <span className='text-sm text-muted-foreground'>
              {healthCheck === undefined
                ? 'Checking...'
                : healthCheck === 'OK'
                ? 'Connected'
                : 'Error'}
            </span>
          </div>
        </section>
        <section className='rounded-lg border p-4'>
          <h2 className='mb-2 font-medium'>Next steps</h2>
          <ul className='list-disc pl-5 text-sm text-muted-foreground'>
            <li>
              <Link to='/scans' className='text-primary underline'>
                Run a scan
              </Link>
            </li>
            <li>
              <Link to={'/map' as any} className='text-primary underline'>
                View detections on a map
              </Link>
            </li>
          </ul>
        </section>
        <section className='rounded-lg border p-4'>
          <h2 className='mb-2 font-medium'>Auth</h2>
          <Authenticated>
            Authenticated
            <button onClick={() => signOut()}>Sign out</button>
          </Authenticated>
          <Unauthenticated>
            Unauthenticated
            <Link to='/login' className='text-primary underline'>
              Sign in
            </Link>
          </Unauthenticated>
          <AuthLoading>Loading...</AuthLoading>
        </section>
      </div>
    </div>
  );
}
