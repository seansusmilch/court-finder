import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Navigation, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  const { emoji, displayName } = getVisualForClass(courtClass);
  const confidence = properties.confidence != null
    ? Math.round(Number(properties.confidence) * 100)
    : null;
  const isVerified = properties.status === 'verified';

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

  // Determine confidence color
  const getConfidenceColor = () => {
    if (confidence === null) return '';
    if (confidence >= 80) return 'text-success bg-success/10 border-success/20';
    if (confidence >= 60) return 'text-warning bg-warning/10 border-warning/20';
    return 'text-destructive bg-destructive/10 border-destructive/20';
  };

  const openDirections = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(url, '_blank');
  };

  const handleFeedback = async (userResponse: 'yes' | 'no') => {
    if (!properties.detection_id || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitFeedback({
        detectionId: properties.detection_id,
        userResponse,
      });
    } catch (error) {
      console.error('Failed to submit feedback', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] no-zoom">
        <div className="flex flex-col overflow-y-auto">
          {/* Header section with emoji and title */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start gap-4">
              <div className="text-5xl">{emoji}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <DrawerTitle className="text-2xl">{displayName}</DrawerTitle>
                  {isVerified && (
                    <span className="text-sm font-medium text-success bg-success/10 px-3 py-1 rounded-full">
                      Verified
                    </span>
                  )}
                </div>
                {confidence !== null && (
                  <div className={cn(
                    'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border',
                    getConfidenceColor()
                  )}>
                    {confidence}% confidence
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Satellite image */}
          <div className="px-6 pb-4">
            <div className="rounded-xl overflow-hidden border border-border/50">
              <CourtSatelliteImage courtData={courtImageData ?? null} />
            </div>
          </div>

          {/* Distance */}
          <div className="px-6 pb-4">
            <DistanceDisplay
              userLocation={userLocation}
              latitude={latitude}
              longitude={longitude}
              loading={locationLoading}
              error={locationError}
            />
          </div>

          {/* Action buttons */}
          <div className="px-6 pb-4">
            <div className="flex gap-3">
              <Button
                onClick={openDirections}
                className="flex-1"
                size="lg"
              >
                <Navigation className="mr-2 h-5 w-5" />
                Get Directions
              </Button>
              <FavoriteButton courtId={properties.detection_id} showLabel={false} />
            </div>
          </div>

          {/* Feedback section for unverified courts */}
          {!isVerified && (
            <div className="px-6 pb-4">
              <div className="bg-muted/60 rounded-xl p-5 space-y-3">
                <div className="text-center">
                  <h3 className="text-base font-semibold">Help verify this court</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Is this actually a {displayName}?
                  </p>
                </div>

                {userFeedback ? (
                  <div className="text-center py-2">
                    <span className="text-sm text-muted-foreground">
                      {userFeedback.userResponse === 'yes' && '✅ You confirmed this is a court'}
                      {userFeedback.userResponse === 'no' && '❌ You reported this is not a court'}
                      {userFeedback.userResponse === 'unsure' && '🤔 You were unsure'}
                    </span>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleFeedback('no')}
                      disabled={isSubmitting}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      No
                    </Button>
                    <Button
                      onClick={() => handleFeedback('yes')}
                      disabled={isSubmitting}
                      variant="outline"
                      size="lg"
                      className="flex-1"
                    >
                      <ThumbsUp className="mr-2 h-4 w-4" />
                      Yes
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Details section */}
          <div className="px-6 pb-6 space-y-5">
            <div className="space-y-2">
              <h3 className="text-base font-semibold">Location</h3>
              <div className="text-sm text-muted-foreground font-mono bg-muted/50 rounded-xl p-4">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </div>
            </div>

            {properties.zoom_level != null && (
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Detection Details</h3>
                <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-4">
                  <div className="flex justify-between">
                    <span>Detected at zoom level:</span>
                    <span className="font-mono font-medium">{String(properties.zoom_level)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="font-mono font-medium">{properties.model} v{properties.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Detection ID:</span>
                    <span className="font-mono text-xs">{properties.detection_id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
