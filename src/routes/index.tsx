import { createFileRoute, Link } from '@tanstack/react-router';
import { Show } from '@clerk/react';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  CircleDotDashed,
  Diamond,
  Eye,
  Goal,
  LocateFixed,
  MapPin,
  Route as RouteIcon,
  ScanSearch,
  ShieldCheck,
  Trophy,
  Volleyball,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

const facilityTypes: Array<{
  name: string;
  detail: string;
  icon: LucideIcon;
  color: string;
}> = [
  {
    name: 'Basketball',
    detail: 'Full and half courts',
    icon: Volleyball,
    color: 'bg-basketball',
  },
  {
    name: 'Tennis',
    detail: 'Single courts and complexes',
    icon: CircleDotDashed,
    color: 'bg-tennis',
  },
  {
    name: 'Soccer / football',
    detail: 'Marked fields and pitches',
    icon: Goal,
    color: 'bg-soccer',
  },
  {
    name: 'Baseball',
    detail: 'Diamonds and ballparks',
    icon: Diamond,
    color: 'bg-baseball',
  },
  {
    name: 'Track and field',
    detail: 'Running tracks and facilities',
    icon: RouteIcon,
    color: 'bg-track',
  },
];

function MapCta() {
  return (
    <>
      <Show when='signed-out'>
        <Button
          asChild
          size='lg'
          className='h-13 px-7 text-base'
        >
          <Link to='/map'>
            Explore the map
            <ArrowRight aria-hidden='true' className='size-4' />
          </Link>
        </Button>
      </Show>
      <Show when='signed-in'>
        <Button
          asChild
          size='lg'
          className='h-13 px-7 text-base'
        >
          <Link to='/map'>
            Open the map
            <ArrowRight aria-hidden='true' className='size-4' />
          </Link>
        </Button>
      </Show>
    </>
  );
}

function SatellitePreview() {
  return (
    <div className='marketing-preview relative isolate min-h-[24rem] overflow-hidden rounded-2xl bg-card shadow-2xl md:min-h-[34rem]'>
      <img
        src='/satellite-example.png'
        alt='Satellite view with possible sports facilities marked on the map'
        decoding='async'
        className='absolute inset-0 size-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.02]'
      />
      <div className='absolute inset-0 bg-[linear-gradient(180deg,transparent_35%,oklch(0.12_0.02_45/.88)_100%)]' />

      <div className='absolute left-[53%] top-[11%] h-[31%] w-[33%] rounded-md border border-primary bg-primary/10 shadow-[0_12px_30px_oklch(0_0_0/.3)]'>
        <span className='absolute -top-7 left-0 rounded-sm bg-primary px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wider text-primary-foreground'>
          Tennis · possible
        </span>
        <span className='absolute -bottom-8 right-0 rounded-sm bg-black/75 px-2 py-1 font-mono text-xs text-white'>
          86% model confidence
        </span>
      </div>

      <div className='absolute left-[8%] top-[20%] h-[50%] w-[42%] rounded-md border border-white/80 bg-white/5'>
        <span className='absolute -bottom-8 left-0 rounded-sm bg-black/75 px-2 py-1 font-mono text-xs text-white'>
          Field · possible
        </span>
      </div>

      <div className='absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 rounded-xl bg-black/75 p-4 text-white backdrop-blur-md md:inset-x-6 md:bottom-6 md:p-5'>
        <div className='flex min-w-0 items-center gap-3'>
          <span className='grid size-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground'>
            <ScanSearch aria-hidden='true' className='size-5' />
          </span>
          <div className='min-w-0'>
            <p className='font-display text-sm font-semibold md:text-base'>
              Satellite scan in view
            </p>
            <p className='truncate text-xs text-white/65 md:text-sm'>
              Review the image before you make the trip
            </p>
          </div>
        </div>
        <div className='hidden items-center gap-2 font-mono text-xs uppercase tracking-widest text-white/70 sm:flex'>
          <span className='size-1.5 rounded-full bg-accent' />
          example imagery
        </div>
      </div>
    </div>
  );
}

function TrustNote() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerId = 'trust-note-trigger';
  const panelId = 'trust-note-panel';

  return (
    <div className='border-y border-border/80'>
      <button
        type='button'
        id={triggerId}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
        className='flex min-h-16 w-full items-center justify-between gap-4 py-4 text-left outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background'
      >
        <span className='flex items-center gap-3'>
          <ShieldCheck aria-hidden='true' className='size-5 shrink-0 text-accent' />
          <span>
            <span className='block font-display font-semibold'>A detection is a lead, not a promise.</span>
            <span className='mt-0.5 block text-sm text-muted-foreground'>
              Check access, hours, conditions, and permission before visiting.
            </span>
          </span>
        </span>
        <ChevronDown
          aria-hidden='true'
          className={`size-5 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div
          id={panelId}
          role='region'
          aria-labelledby={triggerId}
          className='max-w-3xl pb-6 pl-8 text-sm leading-6 text-muted-foreground'
        >
          <p>
            Computer vision can be wrong, and satellite imagery may not reflect current conditions.
            A pin does not mean a facility is public, open, safe, or available. Respect posted signs
            and never enter private property without permission.
          </p>
          <p className='mt-3'>
            Read the <Link to='/terms' className='underline decoration-primary/60 underline-offset-4 hover:text-foreground'>terms</Link>
            {' '}and <Link to='/privacy' className='underline decoration-primary/60 underline-offset-4 hover:text-foreground'>privacy policy</Link>.
          </p>
        </div>
      )}
    </div>
  );
}

function HomeComponent() {
  return (
    <div className='marketing-page w-full overflow-x-clip'>
      <section className='relative isolate border-b border-border/70'>
        <div className='marketing-orbit pointer-events-none absolute -right-56 -top-72 -z-10 size-[42rem] rounded-full border border-primary/15' />
        <div className='pointer-events-none absolute -right-24 -top-40 -z-10 size-[25rem] rounded-full border border-primary/10' />

        <div className='mx-auto grid min-h-[calc(100svh-57px)] max-w-[90rem] items-center gap-10 px-5 py-10 sm:px-8 md:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-12 xl:px-16'>
          <div className='order-1 max-w-2xl'>
            <h1 className='max-w-[11ch] text-balance font-display text-[clamp(3.2rem,7vw,6rem)] font-bold leading-[0.92] tracking-[-0.04em]'>
              Find the places <span className='text-primary'>maps miss.</span>
            </h1>

            <p className='mt-6 max-w-[58ch] text-base leading-7 text-muted-foreground md:mt-7 md:text-xl md:leading-8'>
              Court Finder scans available satellite imagery for possible facilities, then puts
              basketball courts, tennis courts, fields, diamonds, and tracks on one map.
            </p>

            <div className='mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center'>
              <MapCta />
              <a
                href='#how-it-works'
                className='hidden min-h-11 items-center gap-2 px-2 text-sm font-semibold underline decoration-border underline-offset-8 transition-colors hover:text-primary hover:decoration-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex'
              >
                See how detections work
              </a>
            </div>

            <p className='mt-4 max-w-[50ch] text-sm leading-6 text-muted-foreground'>
              Detections are leads—verify access, hours, and conditions before visiting.
            </p>

            <div className='mt-9 hidden flex-wrap gap-x-6 gap-y-3 border-t border-border/70 pt-6 text-sm text-muted-foreground md:flex'>
              <span className='flex items-center gap-2'><Check className='size-4 text-accent' /> Browse without an account</span>
              <span className='flex items-center gap-2'><Check className='size-4 text-accent' /> Confidence shown on every result</span>
            </div>
          </div>

          <div className='group order-2'>
            <SatellitePreview />
          </div>
        </div>
      </section>

      <section aria-labelledby='facility-heading' className='bg-foreground text-background'>
        <div className='mx-auto max-w-[90rem] px-5 py-8 sm:px-8 lg:px-12 xl:px-16'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between'>
            <h2 id='facility-heading' className='max-w-sm font-display text-2xl font-semibold tracking-tight'>
              Five facility types. One search.
            </h2>
            <div className='grid flex-1 grid-cols-2 gap-x-5 gap-y-5 sm:grid-cols-3 lg:max-w-4xl lg:grid-cols-5'>
              {facilityTypes.map(({ name, detail, icon: Icon, color }) => (
                <div key={name} className='flex min-w-0 items-center gap-3'>
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${color} text-white`}>
                    <Icon className='size-[18px]' strokeWidth={1.8} />
                  </span>
                  <span className='min-w-0'>
                    <span className='block text-sm font-semibold leading-5'>{name}</span>
                    <span className='mt-0.5 hidden text-xs text-background/55 xl:block'>{detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id='how-it-works' className='mx-auto max-w-[90rem] px-5 py-20 sm:px-8 md:py-28 lg:px-12 xl:px-16'>
        <div className='grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20'>
          <div className='lg:sticky lg:top-28 lg:self-start'>
            <h2 className='max-w-[10ch] text-balance font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] md:text-6xl'>
              From overhead pixels to a place worth checking.
            </h2>
            <p className='mt-6 max-w-[48ch] text-lg leading-8 text-muted-foreground'>
              Normal place listings depend on somebody adding and maintaining them. Court Finder
              starts with what is visible from above, then keeps the uncertainty attached.
            </p>
          </div>

          <ol className='divide-y divide-border border-y border-border'>
            {[
              {
                icon: LocateFixed,
                title: 'Choose an area',
                text: 'Search a location or move around the map. Filters narrow the results by facility type and model confidence.',
              },
              {
                icon: ScanSearch,
                title: 'Inspect possible facilities',
                text: 'Computer vision looks for visible court and field patterns in the latest imagery available from the provider.',
              },
              {
                icon: Eye,
                title: 'Check the evidence',
                text: 'Open a result to review the satellite image, facility type, confidence, and community feedback before deciding to visit.',
              },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className='grid gap-4 py-8 sm:grid-cols-[3.5rem_1fr] sm:py-10'>
                <span className='grid size-12 place-items-center rounded-full bg-primary/12 text-primary'>
                  <Icon className='size-6' strokeWidth={1.8} />
                </span>
                <div>
                  <h3 className='font-display text-2xl font-semibold tracking-tight'>{title}</h3>
                  <p className='mt-3 max-w-[58ch] leading-7 text-muted-foreground'>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className='border-y border-border/80 bg-muted/30'>
        <div className='mx-auto grid max-w-[90rem] gap-10 px-5 py-20 sm:px-8 md:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 lg:px-12 xl:px-16'>
          <div className='relative overflow-hidden rounded-2xl bg-card shadow-xl'>
            <img
              src='/satellite-example.png'
              alt='Example satellite imagery used to review a possible sports facility'
              width={701}
              height={564}
              loading='lazy'
              decoding='async'
              className='aspect-[16/10] size-full object-cover'
            />
            <div className='absolute inset-0 bg-black/15' />
            <div className='absolute left-[61%] top-[13%] h-[32%] w-[26%] rounded-sm border-2 border-primary shadow-[0_10px_30px_oklch(0_0_0/.35)]' />
            <div className='absolute bottom-4 left-4 right-4 flex items-center justify-between gap-4 rounded-xl bg-black/80 p-4 text-white backdrop-blur-md'>
              <div>
                <p className='font-mono text-xs uppercase tracking-[0.16em] text-white/70'>Example result</p>
                <p className='mt-1 font-display font-semibold'>Possible tennis courts</p>
              </div>
              <span className='rounded-full bg-white/10 px-3 py-1.5 font-mono text-xs'>86% model confidence</span>
            </div>
          </div>

          <div className='self-center'>
            <h2 className='max-w-[12ch] text-balance font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] md:text-5xl'>
              See what the model saw.
            </h2>
            <p className='mt-6 max-w-[52ch] text-lg leading-8 text-muted-foreground'>
              Every pin leads back to its satellite context. Confidence helps you sort results. It
              is not an accuracy guarantee, so the image and local rules still matter.
            </p>
            <ul className='mt-8 space-y-4 text-sm'>
              {[
                'Original satellite context',
                'Detected facility type and model confidence',
                'Community confirmations, rejections, or unclear votes',
                'Favorites saved on your current device',
              ].map((item) => (
                <li key={item} className='flex items-start gap-3'>
                  <span className='mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent/15 text-accent'>
                    <Check className='size-3.5' strokeWidth={2.5} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-[90rem] px-5 py-20 sm:px-8 md:py-28 lg:px-12 xl:px-16'>
        <div className='grid items-end gap-10 lg:grid-cols-[1fr_auto]'>
          <div>
            <Trophy className='mb-6 size-9 text-primary' strokeWidth={1.6} />
            <h2 className='max-w-[13ch] text-balance font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] md:text-6xl'>
              A possible facility may be one pin away.
            </h2>
            <p className='mt-6 max-w-[54ch] text-lg leading-8 text-muted-foreground'>
              Search somewhere familiar or explore a city you have never played in. No account is
              needed to browse detections.
            </p>
          </div>
          <div className='flex flex-col items-start gap-4 lg:items-end'>
            <MapCta />
            <span className='flex items-center gap-2 text-xs text-muted-foreground'>
              <MapPin aria-hidden='true' className='size-3.5' /> Verify access before visiting
            </span>
          </div>
        </div>

        <div className='mt-16'>
          <TrustNote />
        </div>
      </section>

      <footer className='border-t border-border/80 bg-muted/20'>
        <div className='mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-8 text-sm text-muted-foreground sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12 xl:px-16'>
          <div className='flex items-center gap-3 text-foreground'>
            <img src='/logo.webp' alt='' className='size-7 object-contain' />
            <span className='font-display font-semibold'>Court Finder</span>
            <span className='text-muted-foreground'>© {new Date().getFullYear()}</span>
          </div>
          <nav aria-label='Footer' className='flex flex-wrap gap-x-6 gap-y-3'>
            <Link to='/map' className='transition-colors hover:text-foreground'>Map</Link>
            <Link to='/terms' className='transition-colors hover:text-foreground'>Terms</Link>
            <Link to='/privacy' className='transition-colors hover:text-foreground'>Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
