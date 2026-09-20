import { Marker } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { CourtFeatureProperties } from '@/lib/types';
import { useTheme } from '@/components/theme-provider';
import { getSportIconName, SportIcon } from './sport-icons';

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
  const { colorLight, colorDark } = getVisualForClass(courtClass);
  const { theme, systemTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  const isVerified = properties.status === 'verified';

  const markerColor = isDark ? colorDark : colorLight;
  const sportIconName = getSportIconName(courtClass);

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
            'size-11 drop-shadow-md transition-[filter,opacity] duration-200',
            isVerified ? 'drop-shadow-lg' : 'opacity-90'
          )}
          fill={markerColor}
          stroke='white'
          strokeWidth={2.25}
          aria-hidden
        />
        <span
          className='absolute inset-x-0 top-[7px] flex justify-center'
          aria-hidden='true'
        >
          <SportIcon
            name={sportIconName}
            className='size-[1.15rem] text-white drop-shadow-sm'
            strokeWidth={2.15}
          />
        </span>
      </button>
    </Marker>
  );
}
