import { Marker } from 'react-map-gl/mapbox';
import { getVisualForClass } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface CourtMarkerProps {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
  onClick: (
    longitude: number,
    latitude: number,
    properties: Record<string, unknown>
  ) => void;
}

export function CourtMarker({
  longitude,
  latitude,
  properties,
  onClick,
}: CourtMarkerProps) {
  const courtClass = properties.class ? String(properties.class) : '';
  const { emoji, className } = getVisualForClass(courtClass);

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
      <div className='flex flex-col items-center'>
        <div
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-full',
            className
          )}
        >
          <span className='text-[20px]' aria-hidden>
            {emoji}
          </span>
        </div>
        {/* Arrow pointing down */}
        <div
          className={cn(
            'w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-black opacity-70 -mt-1',
            className
          )}
          aria-hidden
        />
      </div>
    </Marker>
  );
}
