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
  const { emoji, color } = getVisualForClass(courtClass);
  const bgClass = `bg-${color}`;
  const borderTopClass = `border-t-${color}`;

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
            'w-10 h-10 flex items-center justify-center rounded-full text-white shadow',
            bgClass
          )}
        >
          <span className='text-[20px]' aria-hidden>
            {emoji}
          </span>
        </div>
        {/* Arrow pointing down */}
        <div
          className={cn(
            'w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent -mt-1',
            borderTopClass
          )}
          aria-hidden
        />
      </div>
    </Marker>
  );
}
