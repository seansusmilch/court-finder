import { createFileRoute, useRouter, Link } from '@tanstack/react-router';
import { api } from '@backend/_generated/api';
import { LOCALSTORAGE_KEYS } from '@/lib/constants';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAction } from 'convex/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Image as ImageIcon, Clock, Filter } from 'lucide-react';
import type { Id } from '@backend/_generated/dataModel';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// Custom hook for localStorage state management
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

export const Route = createFileRoute('/_authed/admin/review/')({
  loader: async ({ context }) => {
    const [pending, processed] = await Promise.all([
      context.convex.query(api.upload_batches.getPendingBatches, {}),
      context.convex.query(api.upload_batches.getProcessedBatches, {}),
    ]);
    return { pending, processed };
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { pending, processed } = Route.useLoaderData();
  const processNewBatch = useAction(api.upload_batches.processNewBatch);
  const router = useRouter();

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [isAdvancedView, setIsAdvancedView] = useLocalStorage(
    LOCALSTORAGE_KEYS.ADMIN_REVIEW_ADVANCED_VIEW,
    false
  );

  const allClasses = useMemo(() => {
    const classSet = new Set<string>();
    pending.forEach((item) => {
      item.predictions.forEach((p) => {
        classSet.add((p as any).prediction.class);
      });
    });
    return Array.from(classSet);
  }, [pending]);

  const [selectedClasses, setSelectedClasses] = useLocalStorage(
    LOCALSTORAGE_KEYS.ADMIN_REVIEW_SELECTED_CLASSES,
    [] as string[]
  );
  const hasInitialized = useRef(false);

  useEffect(() => {
    // Only initialize once when component mounts and we have classes available
    // This ensures we don't override user's "Deselect All" action
    if (!hasInitialized.current && allClasses.length > 0) {
      // If no classes are selected from localStorage, select all by default
      if (selectedClasses.length === 0) {
        setSelectedClasses(allClasses);
      }
      hasInitialized.current = true;
    }
  }, [allClasses, selectedClasses, setSelectedClasses]);

  const isFilterActive = useMemo(() => {
    return selectedClasses.length < allClasses.length;
  }, [selectedClasses, allClasses]);

  const filteredPending = useMemo(() => {
    return pending.filter((item) => {
      // If no classes are selected, show no items
      if (selectedClasses.length === 0) {
        return false;
      }

      // Otherwise, show items that have at least one selected class
      return item.predictions.some((p) =>
        selectedClasses.includes((p as any).prediction.class)
      );
    });
  }, [pending, selectedClasses]);

  const filteredProcessed = useMemo(() => {
    // Since processed items don't have predictions loaded, we can't filter them by class.
    // You might want to adjust this logic based on your needs.
    return processed;
  }, [processed]);

  const feedbackCount = useMemo(
    () => pending.reduce((acc, item) => acc + item.feedbackCount, 0),
    [pending]
  );

  return (
    <div className='p-4'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold'>Training Data</h1>
          <p>{feedbackCount} feedback submissions</p>
        </div>
        <div className='flex items-center space-x-4'>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant='outline' className='relative'>
                <Filter className='mr-2 h-4 w-4' />
                Filters
                {isFilterActive && (
                  <span className='absolute -right-1 -top-1 flex h-3 w-3'>
                    <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75'></span>
                    <span className='relative inline-flex h-3 w-3 rounded-full bg-sky-500'></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className='w-80'>
              <div className='grid gap-4'>
                <div className='space-y-2'>
                  <h4 className='font-medium leading-none'>Class Filters</h4>
                  <p className='text-sm text-muted-foreground'>
                    Select the classes to display.
                  </p>
                </div>
                <div className='flex items-center space-x-2'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedClasses(allClasses)}
                  >
                    Select All
                  </Button>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedClasses([])}
                  >
                    Deselect All
                  </Button>
                </div>
                <div className='grid gap-2'>
                  {allClasses.map((className) => (
                    <div
                      key={className}
                      className='flex items-center space-x-2'
                    >
                      <Checkbox
                        id={className}
                        checked={selectedClasses.includes(className)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedClasses((prev) => [...prev, className]);
                          } else {
                            setSelectedClasses((prev) =>
                              prev.filter((c) => c !== className)
                            );
                          }
                        }}
                      />
                      <Label htmlFor={className}>{className}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <div className='flex items-center space-x-2'>
            <Label htmlFor='advanced-view'>Advanced View</Label>
            <Switch
              id='advanced-view'
              checked={isAdvancedView}
              onCheckedChange={setIsAdvancedView}
            />
          </div>
        </div>
      </div>
      <Tabs defaultValue='pending' className='mt-3'>
        <TabsList className='sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/70 bg-background/90 border-b rounded-none px-1 py-1'>
          <TabsTrigger value='pending'>
            Pending ({filteredPending.length})
          </TabsTrigger>
          <TabsTrigger value='processed'>
            Processed ({filteredProcessed.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value='pending'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            {filteredPending.map((item) => {
              const { tile, predictionsCount, covered, missing, coveragePct } =
                item;
              const locationLabel = item.tile.reverseGeocode;

              const predictionClassCounts = item.predictions.reduce(
                (acc, p) => {
                  const className = (p as any).prediction.class;
                  acc[className] = (acc[className] || 0) + 1;
                  return acc;
                },
                {} as Record<string, number>
              );

              return (
                <Card key={tile._id} className='h-full hover:shadow'>
                  <Link
                    to={'/admin/review/$tileId'}
                    params={{ tileId: String(tile._id) }}
                    className='block focus:outline-none focus:ring-2 focus:ring-ring'
                  >
                    <CardHeader className='flex flex-row items-center justify-between py-3'>
                      <CardTitle className='text-base'>
                        {locationLabel}
                      </CardTitle>
                      <CardDescription>{`x/y/z: ${tile.x}/${tile.y}/${tile.z}`}</CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                      <div className='text-sm text-muted-foreground'>
                        <span className='md:hidden'>
                          {`P: ${predictionsCount} - F: ${item.feedbackCount} - Coverage: ${coveragePct}%`}
                        </span>
                        <span className='hidden md:block'>
                          Predictions: {predictionsCount} • Feedback:{' '}
                          {item.feedbackCount} • Coverage: {coveragePct}%
                        </span>
                      </div>
                      <div className='relative mt-1 h-6 w-full overflow-hidden rounded-full bg-red-200'>
                        <div
                          className='h-full bg-green-500'
                          style={{ width: `${coveragePct}%` }}
                        />
                        <div className='absolute inset-0 flex items-center justify-between px-2 text-xs font-semibold'>
                          <span className='text-white'>{covered}</span>
                          <span className='text-red-700'>{missing}</span>
                        </div>
                      </div>
                      {isAdvancedView && (
                        <div className='mt-2'>
                          <h4 className='font-semibold'>Prediction Classes</h4>
                          <div className='flex flex-wrap gap-1'>
                            {Object.entries(predictionClassCounts).map(
                              ([className, count]) => (
                                <Badge key={className} variant='secondary'>
                                  {className}: {count}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Link>
                  {isAdvancedView && (
                    <CardFooter>
                      <Button
                        disabled={processingIds.has(String(tile._id))}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const id = String(tile._id);
                          try {
                            setProcessingIds((prev) => new Set(prev).add(id));
                            toast.info('Processing batch...');
                            await processNewBatch({
                              tileId: tile._id as Id<'tiles'>,
                            });
                            toast.success(
                              'Batch processed. Moving to Processed.'
                            );
                            router.invalidate();
                          } catch (err) {
                            toast.error('Failed to process batch');
                          } finally {
                            setProcessingIds((prev) => {
                              const next = new Set(prev);
                              next.delete(id);
                              return next;
                            });
                          }
                        }}
                      >
                        {processingIds.has(String(tile._id))
                          ? 'Processing…'
                          : 'Process'}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
        <TabsContent value='processed'>
          <div className='grid grid-cols-1 gap-3 md:grid-cols-3'>
            {filteredProcessed.map((item) => {
              const { tile, batch } = item as any;
              const locationLabel = tile.reverseGeocode;
              const status = (item as any).annotated
                ? 'Annotated'
                : (item as any).imageUploaded
                ? 'Image Uploaded'
                : 'Created';
              return (
                <Card key={batch._id} className='h-full hover:shadow'>
                  <Link
                    to={'/admin/review/$tileId'}
                    params={{ tileId: String(tile._id) }}
                    className='block focus:outline-none focus:ring-2 focus:ring-ring'
                  >
                    <CardHeader className='flex flex-row items-center justify-between py-3'>
                      <div>
                        <CardTitle className='text-base'>
                          {locationLabel}
                        </CardTitle>
                        <CardDescription>{`x/y/z: ${tile.x}/${tile.y}/${tile.z}`}</CardDescription>
                      </div>
                      <div className='flex items-center gap-2'>
                        {status === 'Annotated' && (
                          <Badge className='gap-1'>
                            <CheckCircle2 className='size-3' /> Completed
                          </Badge>
                        )}
                        {status === 'Image Uploaded' && (
                          <Badge variant='secondary' className='gap-1'>
                            <ImageIcon className='size-3' /> Image uploaded
                          </Badge>
                        )}
                        {status === 'Created' && (
                          <Badge variant='outline' className='gap-1'>
                            <Clock className='size-3' /> Started
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                      <div className='text-sm text-muted-foreground'>
                        Predictions: {(item as any).predictionsCount} •
                        Feedback: {(item as any).feedbackCount} • Coverage:{' '}
                        {(item as any).coveragePct}%
                      </div>
                    </CardContent>
                  </Link>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
