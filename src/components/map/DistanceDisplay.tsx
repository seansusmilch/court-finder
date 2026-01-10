import { MapPin, Navigation } from 'lucide-react';
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
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <MapPin className="h-4 w-4 animate-pulse" />
        <span>Getting your location...</span>
      </div>
    );
  }

  if (error || !userLocation) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <MapPin className="h-4 w-4" />
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
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <Navigation className="h-4 w-4 text-primary" />
      <span className="font-medium">{formatDistance(distanceKm)}</span>
    </div>
  );
}
