import { Marker } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CourtFeatureProperties } from '@/lib/types';
import { useTheme } from '@/components/theme-provider';

interface CourtMarkerProps {
  longitude: number;
  latitude: number;
  properties: CourtFeatureProperties;
  onClick: (
    longitude: number,
    latitude: number,
    properties: CourtFeatureProperties
  ) => void;
}

export function CourtMarker({
  longitude,
  latitude,
  properties,
  onClick,
}: CourtMarkerProps) {
  const courtClass = properties.class ? String(properties.class) : '';
  const { colorLight, colorDark, colorLightMuted, colorDarkMuted } =
    getVisualForClass(courtClass);
  const { theme, systemTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  const isVerified = properties.status === 'verified';

  const arrowColor = isDark
    ? isVerified
      ? colorDark
      : colorDarkMuted
    : isVerified
      ? colorLight
      : colorLightMuted;

  const bgColor = isDark
    ? isVerified
      ? colorDark
      : colorDarkMuted
    : isVerified
      ? colorLight
      : colorLightMuted;

  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      anchor='bottom'
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(longitude, latitude, properties);
      }}
      style={{ cursor: 'pointer' }}
    >
      <button
        type='button'
        onClick={(event) => {
          event.stopPropagation();
          onClick(longitude, latitude, properties);
        }}
        aria-label={`${isVerified ? 'Verified' : 'Possible'} ${courtClass || 'sports facility'} at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
        className='group relative flex size-11 items-center justify-center rounded-full outline-none transition-transform duration-200 hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/50'
      >
        <MapPin
          className={cn(
            'size-11 drop-shadow-md transition-[filter] duration-200',
            isVerified ? 'drop-shadow-lg' : ''
          )}
          fill={bgColor}
          stroke='white'
          strokeWidth={2.25}
          aria-hidden
        />
        <span
          className='absolute bottom-[10px] size-2 rounded-full bg-white/90'
          style={{ backgroundColor: arrowColor }}
          aria-hidden
        />
      </button>
    </Marker>
  );
}
