import { Marker } from 'react-map-gl/mapbox';
import { getVisualForClass } from '@/lib/constants';

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
      <div className='relative group -translate-y-1'>
        <div
          className={`w-9 h-9 rounded-full text-white shadow-lg ring-2 ring-white/80 flex items-center justify-center text-[18px] hover:scale-110 transition-transform duration-150 ${className}`}
        >
          <span aria-hidden>{emoji}</span>
        </div>
        <div
          className={`absolute left-1/2 -translate-x-1/2 -bottom-[6px] w-0 h-0 border-x-[7px] border-x-transparent border-t-[9px] drop-shadow ${className}`}
        />
        <div className='absolute bottom-11 left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none whitespace-nowrap'>
          Click for details
        </div>
      </div>
    </Marker>
  );
}

// visuals are imported from constants
