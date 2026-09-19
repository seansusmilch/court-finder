import { useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import type { Id } from '@backend/_generated/dataModel';
import { PLAN_TIERS } from '@backend/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Crown, Users } from 'lucide-react';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authed/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const users = useQuery(api.users.listForAdmin);
  const updatePlanTier = useMutation(api.users.updatePlanTier);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleTierChange = async (
    userId: Id<'users'>,
    nextIsPro: boolean
  ) => {
    setUpdatingUserId(userId);
    try {
      await updatePlanTier({
        userId,
        planTier: nextIsPro ? PLAN_TIERS.PRO : PLAN_TIERS.FREE,
      });
      toast.success(nextIsPro ? 'User upgraded to Pro' : 'User moved to Free');
    } catch (error) {
      console.error('Failed to update user tier', error);
      toast.error('Failed to update user tier');
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div className='p-4'>
      <div className='mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Users</h1>
          <p className='text-muted-foreground'>
            Manage Free and Pro access for scan limits
          </p>
        </div>
        <Button asChild variant='outline' size='sm' className='self-start'>
          <Link to='/admin'>
            <ArrowLeft className='mr-2 size-4' />
            Admin Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <CardTitle>Account Tiers</CardTitle>
              <CardDescription>
                Pro users skip the Free hourly scan limit
              </CardDescription>
            </div>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted/40'>
              <Users className='size-5 text-muted-foreground' />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {users === undefined ? (
            <div className='space-y-3'>
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
              <Skeleton className='h-16 w-full' />
            </div>
          ) : users.length === 0 ? (
            <p className='text-sm text-muted-foreground'>No users found.</p>
          ) : (
            <div className='divide-y rounded-md border'>
              {users.map((user) => {
                const isPro = user.planTier === PLAN_TIERS.PRO;
                const isUpdating = updatingUserId === user._id;
                const displayName =
                  user.name ||
                  user.email ||
                  (user.isAnonymous ? 'Anonymous user' : 'Unnamed user');

                return (
                  <div
                    key={user._id}
                    className='flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between'
                  >
                    <div className='min-w-0'>
                      <div className='flex flex-wrap items-center gap-2'>
                        <p className='truncate font-medium'>{displayName}</p>
                        <Badge variant={isPro ? 'default' : 'secondary'}>
                          {isPro ? (
                            <Crown className='mr-1 size-3' />
                          ) : null}
                          {isPro ? 'Pro' : 'Free'}
                        </Badge>
                      </div>
                      <p className='mt-1 text-sm text-muted-foreground'>
                        {user.email || user._id}
                      </p>
                    </div>

                    <div className='flex min-h-11 items-center gap-3'>
                      <span className='text-sm text-muted-foreground'>
                        Pro
                      </span>
                      <Switch
                        checked={isPro}
                        disabled={isUpdating}
                        aria-label={`Set ${displayName} Pro access`}
                        onCheckedChange={(checked) =>
                          handleTierChange(user._id, checked)
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
