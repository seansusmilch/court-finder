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
      <DrawerContent className="h-[70vh] no-zoom">
        <div className="flex flex-col h-full overflow-y-auto">
          {/* Satellite image */}
          <div className="px-6 pt-2 pb-4">
            <CourtSatelliteImage courtData={courtImageData ?? null} />
          </div>

          {/* Header */}
          <DrawerHeader className="px-6 pb-4 text-left">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{emoji}</div>
                <div>
                  <DrawerTitle className="text-xl">{displayName}</DrawerTitle>
                  {confidence !== null && (
                    <div className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border mt-1',
                      getConfidenceColor()
                    )}>
                      {confidence}% confidence
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DrawerHeader>

          {/* Distance */}
          <div className="px-2 py-3">
            <DistanceDisplay
              userLocation={userLocation}
              latitude={latitude}
              longitude={longitude}
              loading={locationLoading}
              error={locationError}
            />
          </div>

          {/* Action buttons */}
          <div className="px-2 py-3 space-y-2">
            <Button
              onClick={openDirections}
              className="w-full"
              size="lg"
            >
              <Navigation className="mr-2 h-4 w-4" />
              Get Directions
            </Button>

            <FavoriteButton courtId={properties.detection_id} />
          </div>

          {/* Feedback section for unverified courts */}
          {!isVerified && (
            <div className="px-2 py-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="text-center">
                  <h3 className="text-sm font-semibold">Help verify this court</h3>
                  <p className="text-xs text-muted-foreground mt-1">
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
                  <div className="flex gap-2">
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
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Location</h3>
              <div className="text-xs text-muted-foreground font-mono bg-muted/50 rounded p-2">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </div>
            </div>

            {properties.zoom_level != null && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Detection Details</h3>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Detected at zoom level:</span>
                    <span className="font-mono">{String(properties.zoom_level)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span className="font-mono">{properties.model} v{properties.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Detection ID:</span>
                    <span className="font-mono text-[10px]">{properties.detection_id}</span>
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
