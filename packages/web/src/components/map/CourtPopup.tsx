import { Popup } from 'react-map-gl/mapbox';
import { Activity } from 'lucide-react';

interface CourtPopupProps {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
  onClose: () => void;
}

export function CourtPopup({
  longitude,
  latitude,
  properties,
  onClose,
}: CourtPopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      onClose={onClose}
      closeButton={true}
      closeOnClick={false}
      offset={[0, -10]}
      className='court-popup'
    >
      <div className='bg-white p-3 rounded-lg shadow-lg max-w-xs'>
        <div className='flex items-center gap-2 mb-2'>
          <Activity size={16} className='text-red-500' />
          <h3 className='font-semibold text-gray-800'>Court Detected</h3>
        </div>
        <div className='space-y-1 text-sm text-gray-600'>
          <div>
            <span className='font-medium'>Location:</span>
            <div className='text-xs text-gray-500'>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>
          {properties.confidence != null && (
            <div>
              <span className='font-medium'>Confidence:</span>
              <span className='ml-1 text-green-600'>
                {Math.round(Number(properties.confidence) * 100)}%
              </span>
            </div>
          )}
          {properties.class != null && (
            <div>
              <span className='font-medium'>Type:</span>
              <span className='ml-1 capitalize'>
                {String(properties.class)}
              </span>
            </div>
          )}
          {properties.zoom_level != null && (
            <div>
              <span className='font-medium'>Detected at zoom:</span>
              <span className='ml-1'>{String(properties.zoom_level)}</span>
            </div>
          )}
        </div>
      </div>
    </Popup>
  );
}
