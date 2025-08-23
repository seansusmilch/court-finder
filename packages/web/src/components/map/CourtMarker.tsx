import { Marker } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';

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
  return (
    <Marker
      longitude={longitude}
      latitude={latitude}
      onClick={(e) => {
        e.originalEvent.stopPropagation();
        onClick(longitude, latitude, properties);
      }}
      style={{ cursor: 'pointer' }}
    >
      <div className='relative group'>
        <div className='bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors duration-200 hover:scale-110 transform'>
          <MapPin size={16} />
        </div>
        {/* Tooltip on hover */}
        <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap'>
          Click for details
        </div>
      </div>
    </Marker>
  );
}
