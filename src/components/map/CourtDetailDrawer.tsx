import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  CircleAlert,
  CircleCheck,
  CircleX,
  LoaderCircle,
  Navigation,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';
import type { CourtFeatureProperties } from '@/lib/types';
import { DistanceDisplay } from '@/components/map/DistanceDisplay';
import { useUserLocation } from '@/hooks/useUserLocation';
import { FavoriteButton } from '@/components/map/FavoriteButton';
import { CourtSatelliteImage } from '@/components/map/CourtSatelliteImage';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/../convex/_generated/api';
import { useState } from 'react';

interface CourtDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  longitude: number;
  latitude: number;
  properties: CourtFeatureProperties;
}

export function CourtDetailDrawer({
  open,
  onOpenChange,
  longitude,
  latitude,
  properties,
}: CourtDetailDrawerProps) {
  const { location: userLocation, error: locationError, loading: locationLoading } = useUserLocation();
  const courtClass = properties.class ? String(properties.class) : '';
  const { bgClass, displayName, emoji } = getVisualForClass(courtClass);
  const confidence = properties.confidence != null
    ? Math.round(Number(properties.confidence) * 100)
    : null;
  const isVerified = properties.status === 'verified';
  const verificationLabel = isVerified
    ? 'Community verified'
    : properties.status === 'rejected'
      ? 'Community review disagrees'
      : 'Not yet verified';

  // Fetch court image data
  const courtImageData = useQuery(
    api.inferences.getCourtImageData,
    open ? { detectionId: properties.detection_id } : 'skip'
  );

  // Check if user has already submitted feedback for this prediction
  const userFeedback = useQuery(
    api.feedback_submissions.getUserFeedbackForPrediction,
    open && !isVerified && properties.detection_id ? { detectionId: properties.detection_id } : 'skip'
  );

  const submitFeedback = useMutation(api.feedback_submissions.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence === null) return '';
    if (confidence >= 80) return 'text-secondary bg-secondary/10 border-secondary/20';
    if (confidence >= 60) return 'text-foreground bg-warning/20 border-warning/30';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const handleFeedback = async (userResponse: 'yes' | 'no') => {
    if (!properties.detection_id || isSubmitting) return;
    setIsSubmitting(true);
    setFeedbackError(null);
    try {
      await submitFeedback({
        detectionId: properties.detection_id,
        userResponse,
      });
    } catch (error) {
      console.error('Failed to submit detection feedback', {
        detectionId: properties.detection_id,
        response: userResponse,
        error,
      });
      setFeedbackError('We couldn’t save that review. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[min(90vh,52rem)] overflow-hidden bg-card no-zoom">
        <DrawerHeader className="relative shrink-0 border-b border-border/70 bg-card px-5 pb-5 pt-6 pr-16 text-left sm:px-6">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 min-h-12 min-w-12 rounded-lg border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"
              aria-label="Close possible facility details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </Button>
          </DrawerClose>
          <div className="flex items-start gap-3">
            <span className={cn('mt-1 flex size-9 shrink-0 items-center justify-center rounded-lg ring-4 ring-muted', bgClass)} aria-hidden="true">
              <span className="text-xl leading-none">{emoji}</span>
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <DrawerTitle className="text-xl leading-tight sm:text-2xl">
                Possible {displayName}
              </DrawerTitle>
              <DrawerDescription className="max-w-2xl leading-relaxed">
                Detected in satellite imagery. Model confidence and community verification are separate signals; confirm access before visiting.
              </DrawerDescription>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {confidence !== null && (
                  <span className={cn(
                    'inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold',
                    getConfidenceColor()
                  )}>
                    <span className="font-normal">Model confidence</span>
                    {confidence}%
                  </span>
                )}
                <span className={cn(
                  'inline-flex min-h-8 items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold',
                  isVerified
                    ? 'border-secondary/25 bg-secondary/10 text-secondary'
                    : 'border-border bg-muted text-muted-foreground'
                )}>
                  {isVerified ? (
                    <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
                  )}
                  {verificationLabel}
                </span>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="court-detail-scrollbar flex-1 overflow-y-auto overscroll-contain">
          <section className="px-5 pt-5 sm:px-6" aria-label="Satellite evidence">
            <div className="overflow-hidden rounded-xl border border-border/60 bg-muted">
              <CourtSatelliteImage
                courtData={courtImageData ?? null}
                loading={courtImageData === undefined}
                alt={`Satellite evidence for possible ${displayName}`}
              />
            </div>
          </section>

          <section className="space-y-4 px-5 py-5 sm:px-6" aria-label="Actions">
            <DistanceDisplay
              userLocation={userLocation}
              latitude={latitude}
              longitude={longitude}
              loading={locationLoading}
              error={locationError}
            />
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={openDirections}
                className="min-h-12 w-full"
                size="lg"
                type="button"
              >
                <Navigation className="h-5 w-5" aria-hidden="true" />
                <span>Directions</span>
              </Button>
              <FavoriteButton courtId={properties.detection_id} showLabel />
            </div>
          </section>

          {!isVerified && (
            <section className="px-5 pb-5 sm:px-6" aria-labelledby="drawer-feedback-heading">
              <div className="space-y-4 border-t border-border/60 pt-5">
                <div>
                  <h3 id="drawer-feedback-heading" className="text-base font-semibold">
                    Review this possible facility
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Does the satellite image look like a {displayName}?
                  </p>
                </div>

                {userFeedback ? (
                  <div className="flex items-start gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
                    {userFeedback.userResponse === 'yes' && <CircleCheck className="mt-0.5 h-4 w-4 text-secondary" aria-hidden="true" />}
                    {userFeedback.userResponse === 'no' && <CircleX className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />}
                    {userFeedback.userResponse === 'unsure' && <CircleAlert className="mt-0.5 h-4 w-4 text-warning" aria-hidden="true" />}
                    <span>
                      {userFeedback.userResponse === 'yes' && 'You marked this detection as a match.'}
                      {userFeedback.userResponse === 'no' && 'You marked this detection as not a match.'}
                      {userFeedback.userResponse === 'unsure' && 'You marked this detection as unclear.'}
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleFeedback('no')}
                      disabled={isSubmitting}
                      variant="outline"
                      size="lg"
                      className="min-h-12 w-full"
                      type="button"
                    >
                      {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsDown className="h-4 w-4" aria-hidden="true" />}
                      <span>Doesn’t match</span>
                    </Button>
                    <Button
                      onClick={() => handleFeedback('yes')}
                      disabled={isSubmitting}
                      variant="outline"
                      size="lg"
                      className="min-h-12 w-full"
                      type="button"
                    >
                      {isSubmitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ThumbsUp className="h-4 w-4" aria-hidden="true" />}
                      <span>Looks right</span>
                    </Button>
                  </div>
                )}
                {feedbackError && (
                  <p className="flex items-center gap-2 text-sm text-destructive" role="alert">
                    <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {feedbackError}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="space-y-5 border-t border-border/60 px-5 pb-6 pt-5 sm:px-6" aria-labelledby="drawer-details-heading">
            <h3 id="drawer-details-heading" className="text-base font-semibold">Detection details</h3>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Location</h4>
              <p className="rounded-lg border border-border/60 bg-muted/40 p-3 font-mono text-sm text-foreground">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>

            {(properties.zoom_level != null || properties.model != null || properties.version != null) && (
              <dl className="divide-y divide-border/60 border-y border-border/60 text-sm">
                {properties.zoom_level != null && (
                  <div className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-muted-foreground">Detected at zoom</dt>
                    <dd className="font-mono font-medium text-foreground">{String(properties.zoom_level)}</dd>
                  </div>
                )}
                {(properties.model != null || properties.version != null) && (
                  <div className="flex items-start justify-between gap-4 py-3">
                    <dt className="text-muted-foreground">Model</dt>
                    <dd className="font-mono font-medium text-right text-foreground">
                      {properties.model ?? 'Unknown'}{properties.version != null ? ` v${properties.version}` : ''}
                    </dd>
                  </div>
                )}
                <div className="flex items-start justify-between gap-4 py-3">
                  <dt className="text-muted-foreground">Detection ID</dt>
                  <dd className="max-w-[65%] break-all text-right font-mono text-xs text-foreground">{properties.detection_id}</dd>
                </div>
              </dl>
            )}
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
