import { Component, useMemo, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Gauge,
  CircleAlert,
  RotateCcw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { api } from '@backend/_generated/api';
import type { Id } from '@backend/_generated/dataModel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type UserScanLimit = {
  userId: Id<'users'>;
  externalId: string | null;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin';
  limit: number;
  count: number;
  remaining: number;
  resetAtMs: number | null;
};

const resetTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export const Route = createFileRoute('/_authed/admin/users')({
  component: UsersPage,
});

function formatResetTime(resetAtMs: number | null) {
  if (resetAtMs === null) return 'Ready now';

  return resetTimeFormatter.format(new Date(resetAtMs));
}

function getUserLabel(user: UserScanLimit) {
  if (user.name?.trim()) return user.name.trim();
  if (user.email) return user.email;
  if (user.externalId) return `Account ${user.externalId.slice(-8)}`;
  return 'No profile details';
}

function getUserSecondaryLabel(user: UserScanLimit) {
  if (user.name?.trim() && user.email) return user.email;
  if (user.externalId) return user.externalId;
  return 'No email or profile ID on record';
}

function UserIdentity({ user }: { user: UserScanLimit }) {
  const label = getUserLabel(user);
  const secondaryLabel = getUserSecondaryLabel(user);

  return (
    <div className='min-w-0'>
      <div className='flex min-w-0 items-center gap-2 font-medium'>
        <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'>
          <Users className='size-4' aria-hidden='true' />
        </span>
        <span className='truncate' title={label}>
          {label}
        </span>
      </div>
      <div
        className='mt-1 truncate pl-11 text-xs text-muted-foreground'
        title={secondaryLabel}
      >
        {secondaryLabel}
      </div>
    </div>
  );
}

function UsageSummary({
  user,
  className,
}: {
  user: UserScanLimit;
  className?: string;
}) {
  const usedCount = Math.max(0, user.count);
  const limit = Math.max(1, user.limit);
  const percentage = Math.min(100, (usedCount / limit) * 100);

  return (
    <div className={cn('min-w-36 space-y-2', className)}>
      <div className='flex items-center justify-between gap-3 text-sm'>
        <span className='font-medium'>
          {usedCount}/{limit} used
        </span>
        <span className='text-xs text-muted-foreground'>per hour</span>
      </div>
      <div
        className='h-2 overflow-hidden rounded-full bg-muted'
        role='progressbar'
        aria-label={`${usedCount} of ${limit} scans used`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(limit, usedCount)}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] motion-reduce:transition-none',
            user.remaining <= 0 ? 'bg-destructive' : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ResetUserButton({
  user,
  onReset,
  resettingUserId,
  className,
}: {
  user: UserScanLimit;
  onReset: (user: UserScanLimit) => void;
  resettingUserId: Id<'users'> | null;
  className?: string;
}) {
  const isResetting = resettingUserId === user.userId;

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      className={cn('min-h-11 min-w-28', className)}
      disabled={resettingUserId !== null}
      aria-label={`Reset scans for ${getUserLabel(user)}`}
      onClick={() => onReset(user)}
    >
      <RotateCcw
        className={cn('size-4', isResetting && 'animate-spin motion-reduce:animate-none')}
        aria-hidden='true'
      />
      {isResetting ? 'Resetting...' : 'Reset scans'}
    </Button>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className='px-4 py-12 text-center'>
      <Users
        className='mx-auto size-8 text-muted-foreground/60'
        aria-hidden='true'
      />
      <p className='mt-3 font-medium'>
        {hasSearch ? 'No users match your search' : 'No users are available'}
      </p>
      <p className='mt-1 text-sm text-muted-foreground'>
        {hasSearch
          ? 'Try a different name, email, or account ID.'
          : 'User accounts will appear here when they are available.'}
      </p>
    </div>
  );
}

function UserScanLimitsTable({
  data,
  onReset,
  resettingUserId,
}: {
  data: UserScanLimit[];
  onReset: (user: UserScanLimit) => void;
  resettingUserId: Id<'users'> | null;
}) {
  const [globalFilter, setGlobalFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'user', desc: false },
  ]);

  const columns = useMemo<ColumnDef<UserScanLimit>[]>(
    () => [
      {
        id: 'user',
        accessorFn: getUserLabel,
        header: 'User',
        cell: ({ row }) => <UserIdentity user={row.original} />,
      },
      {
        id: 'usage',
        accessorKey: 'count',
        header: 'Usage',
        cell: ({ row }) => <UsageSummary user={row.original} />,
      },
      {
        id: 'remaining',
        accessorKey: 'remaining',
        header: 'Remaining',
        cell: ({ row }) => (
          <Badge
            variant={row.original.remaining <= 0 ? 'destructive' : 'secondary'}
          >
            {row.original.remaining} available
          </Badge>
        ),
      },
      {
        id: 'resetAtMs',
        accessorKey: 'resetAtMs',
        header: 'Window resets',
        cell: ({ row }) => (
          <span className='whitespace-nowrap text-sm text-muted-foreground'>
            {formatResetTime(row.original.resetAtMs)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: 'Action',
        enableSorting: false,
        cell: ({ row }) => (
          <ResetUserButton
            user={row.original}
            onReset={onReset}
            resettingUserId={resettingUserId}
          />
        ),
      },
    ],
    [onReset, resettingUserId]
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue).trim().toLowerCase();
      if (!search) return true;

      const user = row.original;
      return [user.name, user.email, user.externalId, user.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });
  const rows = table.getRowModel().rows;
  const hasSearch = globalFilter.trim().length > 0;

  return (
    <div className='space-y-4'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div className='relative w-full sm:max-w-sm'>
          <Search
            className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground'
            aria-hidden='true'
          />
          <Input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder='Search users'
            aria-label='Search users'
            className='h-11 pl-9'
          />
        </div>
        <p className='text-sm text-muted-foreground'>
          Showing {rows.length} of {data.length} users
        </p>
      </div>

      <div className='space-y-3 lg:hidden'>
        {rows.length === 0 ? (
          <div className='rounded-lg border'>
            <EmptyState hasSearch={hasSearch} />
          </div>
        ) : (
          rows.map((row) => {
            const user = row.original;

            return (
              <div
                key={row.id}
                className='rounded-lg border bg-muted/10 p-4'
              >
                <div className='flex items-start justify-between gap-3'>
                  <UserIdentity user={user} />
                  <Badge
                    variant={user.remaining <= 0 ? 'destructive' : 'secondary'}
                    className='shrink-0'
                  >
                    {user.remaining} left
                  </Badge>
                </div>
                <div className='mt-4'>
                  <UsageSummary user={user} className='w-full' />
                </div>
                <dl className='mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm'>
                  <div>
                    <dt className='text-muted-foreground'>Window resets</dt>
                    <dd className='mt-1 font-medium'>
                      {formatResetTime(user.resetAtMs)}
                    </dd>
                  </div>
                  <div>
                    <dt className='text-muted-foreground'>Plan limit</dt>
                    <dd className='mt-1 font-medium'>{user.limit} scans/hour</dd>
                  </div>
                </dl>
                <ResetUserButton
                  user={user}
                  onReset={onReset}
                  resettingUserId={resettingUserId}
                  className='mt-4 w-full'
                />
              </div>
            );
          })
        )}
      </div>

      <div className='hidden overflow-hidden rounded-lg border lg:block'>
        <div className='overflow-x-auto'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead className='bg-muted/45 text-xs uppercase tracking-wide text-muted-foreground'>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className='px-4 py-3 font-medium'
                        aria-sort={
                          canSort
                            ? sorted === 'asc'
                              ? 'ascending'
                              : sorted === 'desc'
                                ? 'descending'
                                : 'none'
                            : undefined
                        }
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type='button'
                            className='inline-flex min-h-11 items-center gap-1.5 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ring'
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {sorted === 'asc' ? (
                              <ArrowUp className='size-3.5' aria-hidden='true' />
                            ) : sorted === 'desc' ? (
                              <ArrowDown className='size-3.5' aria-hidden='true' />
                            ) : (
                              <ArrowUpDown className='size-3.5 opacity-50' aria-hidden='true' />
                            )}
                          </button>
                        ) : (
                          flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className='divide-y divide-border'>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='px-4 py-12 text-center'>
                    <EmptyState hasSearch={hasSearch} />
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className='transition-colors hover:bg-muted/30'>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className='px-4 py-4 align-middle'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UserLimitsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className='container mx-auto max-w-7xl px-4 py-8'>
      <Card className='mx-auto max-w-xl'>
        <CardHeader>
          <div className='flex items-start gap-3'>
            <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
              <CircleAlert className='size-5' aria-hidden='true' />
            </div>
            <div>
              <CardTitle>Couldn&apos;t load user limits</CardTitle>
              <CardDescription className='mt-1'>
                The admin user list is temporarily unavailable. Check your connection and try again.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button type='button' className='min-h-11' onClick={onRetry}>
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

class UserLimitsErrorBoundary extends Component<
  Record<string, never>,
  { error: unknown; retryKey: number }
> {
  state = { error: null as unknown, retryKey: 0 };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  handleRetry = () => {
    this.setState(({ retryKey }) => ({
      error: null,
      retryKey: retryKey + 1,
    }));
  };

  render() {
    if (this.state.error !== null) {
      return <UserLimitsError onRetry={this.handleRetry} />;
    }

    return <UsersPageContent key={this.state.retryKey} />;
  }
}

function UsersPage() {
  return <UserLimitsErrorBoundary />;
}

function UsersPageContent() {
  const { isAuthenticated } = useConvexAuth();
  const users = useQuery(
    api.scans.listUserScanLimits,
    isAuthenticated ? {} : 'skip'
  ) as UserScanLimit[] | undefined;
  const resetUserScanLimit = useMutation(api.scans.resetUserScanLimit);
  const [resettingUserId, setResettingUserId] = useState<Id<'users'> | null>(null);
  const [pendingResetUser, setPendingResetUser] =
    useState<UserScanLimit | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleReset = async (user: UserScanLimit) => {
    const startTs = Date.now();
    const userLabel = getUserLabel(user);
    setResettingUserId(user.userId);
    setStatusMessage(null);
    try {
      await resetUserScanLimit({ userId: user.userId });
      setStatusMessage({
        type: 'success',
        text: `${userLabel}'s scan access was reset. They have ${user.limit} scans available for the next hour.`,
      });
      toast.success(`${userLabel}'s scan access reset`);
      return true;
    } catch (error) {
      console.error('admin_scan_limit_reset_failed', {
        startTs,
        durationMs: Date.now() - startTs,
        userId: user.userId,
        error,
      });
      setStatusMessage({
        type: 'error',
        text: `Could not reset ${userLabel}'s scan access. Try again or check your connection.`,
      });
      toast.error(`Could not reset ${userLabel}'s scan access`);
      return false;
    } finally {
      setResettingUserId(null);
    }
  };

  const confirmReset = async () => {
    if (!pendingResetUser) return;

    const didReset = await handleReset(pendingResetUser);
    if (didReset) setPendingResetUser(null);
  };

  if (users === undefined) {
    return (
      <div className='container mx-auto max-w-7xl space-y-6 px-4 py-8'>
        <div className='space-y-2'>
          <Skeleton className='h-9 w-56' />
          <Skeleton className='h-5 w-80' />
        </div>
        <Card>
          <CardContent className='space-y-4 pt-6'>
            <Skeleton className='h-10 w-full max-w-sm' />
            <Skeleton className='h-72 w-full' />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='container mx-auto max-w-7xl space-y-6 px-4 py-8'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <Button
            asChild
            variant='ghost'
            size='sm'
            className='mb-3 min-h-11 -ml-3'
          >
            <Link to='/admin'>
              <ArrowLeft className='size-4' />
              Admin dashboard
            </Link>
          </Button>
          <div className='flex items-start gap-3'>
            <div className='flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <Gauge className='size-5' aria-hidden='true' />
            </div>
            <div>
              <h1 className='font-display text-3xl font-semibold tracking-tight'>User scan limits</h1>
              <p className='mt-1 text-muted-foreground'>
                See each account\'s hourly scan usage and restore access when needed.
              </p>
            </div>
          </div>
        </div>
        <Badge variant='outline' className='w-fit gap-1.5 px-3 py-1.5'>
          <ShieldCheck className='size-4 text-primary' aria-hidden='true' />
          5 scans per hour
        </Badge>
      </div>

      {statusMessage ? (
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
            statusMessage.type === 'success'
              ? 'border-success/30 bg-success/10 text-success-foreground'
              : 'border-destructive/30 bg-destructive/10 text-destructive-foreground'
          )}
          role={statusMessage.type === 'error' ? 'alert' : 'status'}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
          ) : (
            <CircleAlert className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
          )}
          <span>{statusMessage.text}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader className='border-b'>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Resetting a limit gives the user a fresh five-scan window immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className='pt-6'>
          <UserScanLimitsTable
            data={users}
            onReset={setPendingResetUser}
            resettingUserId={resettingUserId}
          />
        </CardContent>
      </Card>

      <Dialog
        open={pendingResetUser !== null}
        onOpenChange={(open) => {
          if (!open && resettingUserId === null) setPendingResetUser(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogClose asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='absolute right-3 top-3 size-11'
              aria-label='Close reset confirmation'
            >
              <X aria-hidden='true' />
            </Button>
          </DialogClose>
          <DialogHeader>
            <DialogTitle>Reset scan access?</DialogTitle>
            <DialogDescription>
              This gives the account a fresh scan window immediately.
            </DialogDescription>
          </DialogHeader>

          {pendingResetUser ? (
            <div className='rounded-lg border bg-muted/30 p-4'>
              <UserIdentity user={pendingResetUser} />
              <dl className='mt-4 grid grid-cols-2 gap-4 border-t pt-3 text-sm'>
                <div>
                  <dt className='text-muted-foreground'>Current usage</dt>
                  <dd className='mt-1 font-medium'>
                    {pendingResetUser.count}/{pendingResetUser.limit} scans used
                  </dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>After reset</dt>
                  <dd className='mt-1 font-medium'>
                    {pendingResetUser.limit} scans available
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type='button' variant='outline' className='min-h-11'>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type='button'
              className='min-h-11'
              disabled={resettingUserId !== null}
              onClick={() => void confirmReset()}
            >
              {resettingUserId !== null ? 'Resetting...' : 'Reset scans'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
