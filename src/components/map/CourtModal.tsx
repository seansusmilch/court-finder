import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface CourtModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  longitude: number;
  latitude: number;
  properties: CourtFeatureProperties;
}

export function CourtModal({
  open,
  onOpenChange,
  longitude,
  latitude,
  properties,
}: CourtModalProps) {
  const { location: userLocation, error: locationError, loading: locationLoading } = useUserLocation();
  const courtClass = properties.class ? String(properties.class) : '';
  const { emoji, displayName } = getVisualForClass(courtClass);
  const isVerified = properties.status === 'verified';
  const confidence = properties.confidence != null
    ? Math.round(Number(properties.confidence) * 100)
    : null;

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

  const courtImageData = useQuery(
    api.inferences.getCourtImageData,
    open ? { detectionId: properties.detection_id } : 'skip'
  );

  const userFeedback = useQuery(
    api.feedback_submissions.getUserFeedbackForPrediction,
    open && !isVerified && properties.detection_id ? { detectionId: properties.detection_id } : 'skip'
  );

  const submitFeedback = useMutation(api.feedback_submissions.submitFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <span>{emoji}</span>
            <span>{displayName}</span>
            {isVerified && (
              <span className="text-sm font-medium text-success bg-success/10 px-3 py-1 rounded-full">
                Verified
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {confidence !== null && (
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
              getConfidenceColor()
            )}>
              {confidence}% confidence
            </div>
          )}

          <div className="rounded-xl overflow-hidden border border-border/50">
            <CourtSatelliteImage courtData={courtImageData ?? null} />
          </div>

          <div>
            <DistanceDisplay
              userLocation={userLocation}
              latitude={latitude}
              longitude={longitude}
              loading={locationLoading}
              error={locationError}
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={openDirections}
              className="flex-1"
              size="lg"
            >
              <Navigation className="mr-2 h-5 w-5" />
              Get Directions
            </Button>
            <FavoriteButton courtId={properties.detection_id} showLabel={true} />
          </div>

          {!isVerified && (
            <div className="bg-muted/60 rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-center">Help verify this court</h3>
              <p className="text-sm text-muted-foreground text-center">
                Is this actually a {displayName}?
              </p>
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
          )}

          <div className="space-y-4 pt-4 border-t border-border/50">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">Location</h3>
              <div className="text-sm text-muted-foreground font-mono bg-muted/50 rounded-lg p-3">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </div>
            </div>

            {properties.zoom_level != null && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Detection Details</h3>
                <div className="space-y-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
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
                    <span className="font-mono text-xs">{properties.detection_id}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
