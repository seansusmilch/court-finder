import { Marker } from 'react-map-gl/mapbox';
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
  const { emoji, colorLight, colorDark, colorLightMuted, colorDarkMuted } =
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
        className='group relative flex flex-col items-center outline-none transition-transform duration-200 hover:scale-110 focus-visible:ring-4 focus-visible:ring-primary/50'
      >
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-full text-white transition-shadow duration-200',
            isVerified ? 'shadow-lg group-hover:shadow-xl' : ''
          )}
          style={{ backgroundColor: bgColor }}
        >
          <span className='text-[20px]' aria-hidden='true'>
            {emoji}
          </span>
        </span>
        <span
          className='-mt-1 h-0 w-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent'
          style={{ borderTopColor: arrowColor }}
          aria-hidden='true'
        />
      </button>
    </Marker>
  );
}
