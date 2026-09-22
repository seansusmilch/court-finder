import { LoaderCircle, MapPin, MapPinOff, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateDistance, formatDistance } from '@/lib/utils';
import type { UserLocation } from '@/hooks/useUserLocation';

interface DistanceDisplayProps {
  userLocation: UserLocation | null;
  latitude: number;
  longitude: number;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

export function DistanceDisplay({
  userLocation,
  latitude,
  longitude,
  loading = false,
  error = null,
  className,
}: DistanceDisplayProps) {
  if (loading) {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
        role="status"
        aria-live="polite"
      >
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Getting your location...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
        role="status"
        aria-live="polite"
      >
        <MapPinOff className="h-4 w-4 text-warning" aria-hidden="true" />
        <span>Distance unavailable. Check location access to try again.</span>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div
        className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}
        role="status"
        aria-live="polite"
      >
        <MapPin className="h-4 w-4" aria-hidden="true" />
        <span>Enable location to see distance</span>
      </div>
    );
  }

  const distanceKm = calculateDistance(
    userLocation.latitude,
    userLocation.longitude,
    latitude,
    longitude
  );

  return (
    <div
      className={cn('flex items-center gap-2 text-sm', className)}
      role="status"
      aria-live="polite"
      aria-label={`Distance from your location: ${formatDistance(distanceKm)}`}
    >
      <Navigation className="h-4 w-4 text-primary" aria-hidden="true" />
      <span className="font-medium">{formatDistance(distanceKm)}</span>
    </div>
  );
}
