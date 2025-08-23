import { Popup } from 'react-map-gl/mapbox';
import { Activity, Target, Shield, Users, Navigation } from 'lucide-react';

interface CourtPopupProps {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
  onClose: () => void;
}

const COURT_TYPE_MAP: Record<string, { name: string; icon: typeof Activity }> =
  {
    'basketball-court': { name: 'Basketball Court', icon: Target },
    'tennis-court': { name: 'Tennis Court', icon: Shield },
    'soccer-ball-field': { name: 'Soccer/Football Field', icon: Users },
    'baseball-diamond': { name: 'Baseball Field', icon: Target },
    'ground-track-field': { name: 'Track & Field', icon: Activity },
    'swimming-pool': { name: 'Swimming Pool', icon: Activity },
  };

function getCourtInfo(predictionClass: string) {
  return (
    COURT_TYPE_MAP[predictionClass] || {
      name: `${predictionClass
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase())} Court`,
      icon: Activity,
    }
  );
}

export function CourtPopup({
  longitude,
  latitude,
  properties,
  onClose,
}: CourtPopupProps) {
  const courtClass = properties.class ? String(properties.class) : '';
  const courtInfo = getCourtInfo(courtClass);
  const IconComponent = courtInfo.icon;

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
          <IconComponent size={16} className='text-red-500' />
          <h3 className='font-semibold text-gray-800'>{courtInfo.name}</h3>
        </div>
        <div className='space-y-1 text-sm text-gray-600'>
          <div>
            <span className='font-medium'>Location:</span>
            <div className='text-xs text-gray-500'>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
            <a
              href={`https://maps.google.com/maps?q=${latitude},${longitude}`}
              target='_blank'
              rel='noopener noreferrer'
              onClick={(e) => {
                e.preventDefault();
                const geoUrl = `geo:${latitude},${longitude}`;

                try {
                  window.open(geoUrl, '_blank');
                  setTimeout(() => {
                    window.open(
                      `https://maps.google.com/maps?q=${latitude},${longitude}`,
                      '_blank'
                    );
                  }, 250);
                } catch (error) {
                  window.open(
                    `https://maps.google.com/maps?q=${latitude},${longitude}`,
                    '_blank'
                  );
                }
              }}
              className='inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 underline mt-1'
              title='Open in default map application'
            >
              <Navigation size={12} />
              Open in Maps
            </a>
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
              <span className='ml-1'>{courtInfo.name}</span>
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
