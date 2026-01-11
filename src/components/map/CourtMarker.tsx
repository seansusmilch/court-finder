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
  const { emoji, bgClass, colorLight, colorDark, colorLightMuted, colorDarkMuted } =
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
      <div className='flex flex-col items-center transition-transform duration-200 hover:scale-110'>
        <div
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-full text-white transition-shadow duration-200',
            isVerified ? 'shadow-lg hover:shadow-xl' : ''
          )}
          style={{ backgroundColor: bgColor }}
        >
          <span className='text-[20px]' aria-hidden>
            {emoji}
          </span>
        </div>
        {/* Arrow pointing down */}
        <div
          className='w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent -mt-1'
          style={{ borderTopColor: arrowColor }}
          aria-hidden
        />
      </div>
    </Marker>
  );
}
