import { createFileRoute, Link } from '@tanstack/react-router';
import { Authenticated, Unauthenticated } from 'convex/react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, CheckCircle, Map, ScanEye } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

function ImageHeroVisual() {
  return (
    <div className='relative order-first h-64 w-full overflow-hidden rounded-2xl border md:order-none md:h-96'>
      <img
        src='/satellite-example.png'
        alt='Satellite view of sports courts'
        className='h-full w-full object-cover'
      />
      <div className='absolute inset-0 bg-gradient-to-t from-background/50 via-background/20 to-transparent' />
      <div className='absolute inset-0 bg-black/20' />
    </div>
  );
}

function HomeComponent() {
  return (
    <div className='container mx-auto px-4 py-12 md:py-20'>
      <div className='mx-auto max-w-6xl'>
        <div className='grid items-center gap-12 md:grid-cols-2'>
          <div className='animate-in fade-in slide-in-from-bottom-6 duration-500'>
            <h1 className='text-4xl font-bold tracking-tighter md:text-6xl'>
              Discover Every Court.
              <br />
              <span className='text-primary'>From Space.</span>
            </h1>
            <p className='mt-6 text-lg text-muted-foreground md:text-xl'>
              Our AI scans satellite imagery to uncover sports courts across the
              globe. Find, verify, and explore athletic fields with
              unprecedented detail.
            </p>
            <div className='mt-8 flex flex-wrap items-center gap-4'>
              <Unauthenticated>
                <Button asChild size='lg'>
                  <Link to={'/login'}>
                    Get Started <ArrowRight className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
                <Button asChild variant='outline' size='lg'>
                  <Link to={'/map'}>Explore the Map</Link>
                </Button>
              </Unauthenticated>
              <Authenticated>
                <Button asChild size='lg'>
                  <Link to={'/map'}>
                    Open Map <Map className='ml-2 h-4 w-4' />
                  </Link>
                </Button>
              </Authenticated>
            </div>
          </div>
          <div className='animate-in fade-in zoom-in-95 duration-500 delay-200'>
            <ImageHeroVisual />
          </div>
        </div>

        <div className='mt-24 grid gap-8 md:grid-cols-3'>
          <Card className='animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <ScanEye className='h-6 w-6 text-primary' />
                AI Detections
              </CardTitle>
              <CardDescription>
                High-precision models tuned for courts
              </CardDescription>
            </CardHeader>
            <CardContent className='text-muted-foreground'>
              Scan anywhere in the world and get detections with confidence
              scores and zoom-level context.
            </CardContent>
          </Card>
          <Card className='animate-in fade-in slide-in-from-bottom-10 duration-700 delay-400'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Map className='h-6 w-6 text-primary' />
                Interactive Map
              </CardTitle>
              <CardDescription>
                Clustered pins and rich popovers
              </CardDescription>
            </CardHeader>
            <CardContent className='text-muted-foreground'>
              Explore results with smooth clustering, emoji markers, and
              detailed information at every zoom level.
            </CardContent>
          </Card>
          <Card className='animate-in fade-in slide-in-from-bottom-10 duration-700 delay-500'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <CheckCircle className='h-6 w-6 text-primary' />
                Review Workflow
              </CardTitle>
              <CardDescription>Filter by confidence and verify</CardDescription>
            </CardHeader>
            <CardContent className='text-muted-foreground'>
              Adjust thresholds, inspect satellite tiles, and help train our AI
              by confirming detections.
            </CardContent>
          </Card>
        </div>

        <div className='mt-24'>
          <Card className='border-destructive bg-destructive/10 text-destructive-foreground'>
            <CardHeader>
              <CardTitle>Disclaimer</CardTitle>
              <CardDescription className='text-destructive/80'>
                Read before visiting any detected location!
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3 text-sm text-destructive/90'>
              <p>
                Detections shown in this app are generated by automated models
                and are provided on an “as is” and “as available” basis without
                any warranty or guarantee of accuracy, completeness, or
                suitability for any purpose.
              </p>
              <p>
                Detected locations may be on private property or subject to
                access restrictions. You are solely responsible for complying
                with all laws, posted signage, and obtaining any required
                permissions. Do not trespass.
              </p>
              <p>
                By using this app, you assume all risk and agree that the
                project maintainers and contributors shall not be liable for any
                injury, damage, citation, or loss arising from your use of the
                information. See our{' '}
                <Link
                  to={'/terms'}
                  className='underline hover:text-destructive'
                >
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link
                  to={'/privacy'}
                  className='underline hover:text-destructive'
                >
                  Privacy Policy
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      <footer className='mt-24 border-t text-sm text-muted-foreground'>
        <div className='container mx-auto px-4 py-4 flex items-center justify-between'>
          <span>© {new Date().getFullYear()} Court Finder</span>
          <nav className='flex gap-4'>
            <Link to={'/terms'} className='hover:underline'>
              Terms
            </Link>
            <Link to={'/privacy'} className='hover:underline'>
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
