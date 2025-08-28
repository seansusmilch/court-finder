import {
  createFileRoute,
  redirect,
  useNavigate,
  useSearch,
} from '@tanstack/react-router';
import { useAuthActions } from '@convex-dev/auth/react';
import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { useConvexAuth } from 'convex/react';

export const Route = createFileRoute('/login')({
  validateSearch: (s: { redirect?: string }) => s,
  beforeLoad: async ({ context }) => {
    if (context.me) throw redirect({ to: '/' });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const { redirect: redirectTo } = Route.useSearch();
  const [step, setStep] = useState<'signUp' | 'signIn'>('signIn');
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setServerError(null);
      await signIn('password', formData);
    },

    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : 'Something went wrong';
      setServerError(message);
    },
  });

  useEffect(() => {
    if (isAuthenticated) {
      let to: string = '/';
      if (redirectTo && typeof redirectTo === 'string') {
        try {
          const url = new URL(redirectTo, window.location.origin);
          if (url.origin === window.location.origin)
            to = url.pathname + url.search + url.hash;
        } catch (_) {
          // ignore malformed redirect
        }
      }
      navigate({ to });
    }
  }, [isAuthenticated, navigate, router]);

  return (
    <div className='flex min-h-[calc(100dvh-0px)] items-center justify-center p-4'>
      <Card className='w-full max-w-sm'>
        <CardHeader>
          <CardTitle>
            {step === 'signIn' ? 'Welcome back' : 'Create an account'}
          </CardTitle>
          <CardDescription>
            {step === 'signIn'
              ? 'Sign in to continue'
              : 'Sign up to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className='grid gap-4'
            onSubmit={async (event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              setConfirmError(null);
              setServerError(null);
              if (step === 'signUp') {
                const password = String(formData.get('password') ?? '');
                const confirm = String(formData.get('confirmPassword') ?? '');
                if (password !== confirm) {
                  setConfirmError("Passwords don't match");
                  return;
                }
              }
              mutation.mutate(formData);
            }}
          >
            <input name='flow' type='hidden' value={step} />
            <div className='grid gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                type='email'
                placeholder='you@example.com'
                required
              />
            </div>
            <div className='grid gap-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                name='password'
                type='password'
                placeholder='••••••••'
                required
              />
            </div>
            {step === 'signUp' ? (
              <div className='grid gap-2'>
                <Label htmlFor='confirmPassword'>Confirm password</Label>
                <Input
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  placeholder='••••••••'
                  required
                />
                {confirmError ? (
                  <p className='text-sm text-destructive'>{confirmError}</p>
                ) : null}
              </div>
            ) : null}
            {serverError ? (
              <p className='text-sm text-destructive'>{serverError}</p>
            ) : null}
            <Button
              type='submit'
              className='w-full'
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? 'Please wait…'
                : step === 'signIn'
                ? 'Sign in'
                : 'Sign up'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className='justify-center'>
          <Button
            type='button'
            variant='link'
            size='sm'
            onClick={() => setStep(step === 'signIn' ? 'signUp' : 'signIn')}
          >
            {step === 'signIn'
              ? 'New here? Create an account'
              : 'Have an account? Sign in'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
