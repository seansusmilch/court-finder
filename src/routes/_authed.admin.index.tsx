import { createFileRoute, Link } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import { useConvexAuth, useQuery } from 'convex/react';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

export const Route = createFileRoute('/_authed/admin/')({
  component: RouteComponent,
});

function formatMetric(value: number | undefined) {
  return value === undefined ? '—' : value.toLocaleString();
}

function RouteComponent() {
  const { isAuthenticated } = useConvexAuth();
  const pending = useQuery(
    api.upload_batches.getPendingBatches,
    isAuthenticated ? { onlyLatestModelVersion: true } : 'skip'
  );
  const processed = useQuery(
    api.upload_batches.getProcessedBatches,
    isAuthenticated ? { onlyLatestModelVersion: true } : 'skip'
  );
  const scans = useQuery(api.scans.listAll, isAuthenticated ? {} : 'skip');
  const metrics = {
    pendingTiles: pending?.length,
    processedBatches: processed?.length,
    scansCount: scans?.length,
    totalFeedback:
      pending && processed
        ? pending.reduce(
            (acc: number, item: { feedbackCount?: number }) =>
              acc + (item.feedbackCount ?? 0),
            0
          ) +
          processed.reduce(
            (acc: number, item: { feedbackCount?: number }) =>
              acc + (item.feedbackCount ?? 0),
            0
          )
        : undefined,
  };

  return (
    <main className='min-h-[calc(100svh-4rem)] bg-muted/20'>
      <div className='mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12'>
        <header className='flex flex-col gap-6 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between'>
          <div className='max-w-xl'>
            <h1 className='font-display text-3xl font-semibold tracking-tight md:text-4xl'>
              Admin
            </h1>
            <p className='mt-2 text-base text-muted-foreground'>
              Keep model training and scan operations moving.
            </p>
          </div>
          <Link
            to='/admin/review'
            className='inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-[background-color,box-shadow] hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:self-auto'
          >
            Review training data
            <ArrowUpRight className='size-4' aria-hidden='true' />
          </Link>
        </header>

        <section className='pt-8' aria-labelledby='overview-heading'>
          <div className='flex items-baseline justify-between gap-4'>
            <h2
              id='overview-heading'
              className='font-display text-lg font-semibold tracking-tight'
            >
              Overview
            </h2>
            <span className='font-mono text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground'>
              Live totals
            </span>
          </div>

          <dl className='mt-4 grid grid-cols-2 overflow-hidden rounded-xl border border-border/70 bg-card sm:grid-cols-4'>
            <Metric label='Pending review' value={metrics.pendingTiles} />
            <Metric label='Processed batches' value={metrics.processedBatches} />
            <Metric label='Recorded scans' value={metrics.scansCount} />
            <Metric label='Feedback' value={metrics.totalFeedback} />
          </dl>
        </section>

        <section className='mt-12' aria-labelledby='workflows-heading'>
          <h2
            id='workflows-heading'
            className='font-display text-lg font-semibold tracking-tight'
          >
            Workflows
          </h2>
          <nav
            className='mt-4 overflow-hidden rounded-xl border border-border/70 bg-card'
            aria-label='Admin workflows'
          >
            <WorkflowLink
              to='/admin/review'
              title='Review training data'
              description='Inspect pending tiles and process feedback.'
              detail={
                metrics.pendingTiles === undefined
                  ? 'Loading'
                  : `${metrics.pendingTiles.toLocaleString()} pending`
              }
              emphasized
            />
            <WorkflowLink
              to='/admin/scans'
              title='Browse scans'
              description='Inspect recorded scan areas and results.'
              detail={
                metrics.scansCount === undefined
                  ? 'Loading'
                  : `${metrics.scansCount.toLocaleString()} recorded`
              }
            />
            <WorkflowLink
              to='/admin/users'
              title='Manage user scan limits'
              description='Review account limits and reset access when needed.'
              detail='Admin only'
            />
          </nav>
        </section>

        <footer className='mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm'>
          <Link
            to='/feedback/help'
            className='font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
          >
            How feedback works
          </Link>
          <Link
            to='/admin/review'
            className='font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50'
          >
            View processed batches
          </Link>
        </footer>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className='min-w-0 border-b border-border/70 px-4 py-5 even:border-l sm:border-b-0 sm:px-5 sm:even:border-l'>
      <dt className='truncate text-sm text-muted-foreground'>{label}</dt>
      <dd className='mt-2 font-display text-2xl font-semibold tracking-tight'>
        {formatMetric(value)}
      </dd>
    </div>
  );
}

function WorkflowLink({
  to,
  title,
  description,
  detail,
  emphasized = false,
}: {
  to: '/admin/review' | '/admin/scans' | '/admin/users';
  title: string;
  description: string;
  detail: string;
  emphasized?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`group flex min-h-20 items-center gap-4 border-b border-border/70 px-4 py-4 transition-colors last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/60 sm:px-5 ${
        emphasized ? 'bg-primary/[0.06] hover:bg-primary/[0.1]' : 'hover:bg-muted/50'
      }`}
    >
      <span className='min-w-0 flex-1'>
        <span className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          <span className='font-semibold'>{title}</span>
          <span className='font-mono text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground'>
            {detail}
          </span>
        </span>
        <span className='mt-1 block text-sm text-muted-foreground'>
          {description}
        </span>
      </span>
      <ChevronRight
        className='size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground'
        aria-hidden='true'
      />
    </Link>
  );
}
