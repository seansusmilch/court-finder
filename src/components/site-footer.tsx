import { Link } from '@tanstack/react-router';

export default function SiteFooter() {
  return (
    <footer className='border-t border-border/80 bg-muted/20'>
      <div className='mx-auto flex max-w-[90rem] flex-col gap-6 px-5 py-8 text-sm text-muted-foreground sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12 xl:px-16'>
        <div className='flex items-center gap-3 text-foreground'>
          <img src='/logo.webp' alt='' className='size-7 object-contain' />
          <span className='font-display font-semibold'>Court Finder</span>
          <span className='text-muted-foreground'>© {new Date().getFullYear()}</span>
        </div>
        <nav aria-label='Footer' className='flex flex-wrap gap-x-6 gap-y-3'>
          <Link to='/map' className='transition-colors hover:text-foreground'>
            Map
          </Link>
          <Link to='/terms' className='transition-colors hover:text-foreground'>
            Terms of Service
          </Link>
          <Link to='/privacy' className='transition-colors hover:text-foreground'>
            Privacy policy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
