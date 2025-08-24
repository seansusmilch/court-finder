import { Popup } from 'react-map-gl/mapbox';
import { Activity, Target, Shield, Users, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <Card className='max-w-xs shadow-sm'>
        <CardHeader className='py-3'>
          <div className='flex items-center gap-2'>
            <IconComponent size={16} className='text-red-500' />
            <CardTitle className='text-sm'>{courtInfo.name}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className='space-y-2'>
          <div>
            <div className='text-xs text-muted-foreground'>Location</div>
            <div className='text-xs'>
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
              className='inline-flex items-center gap-1 text-xs text-primary underline mt-1'
              title='Open in default map application'
            >
              <Navigation size={12} />
              Open in Maps
            </a>
          </div>
          {properties.confidence != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Confidence:</span>
              <span className='ml-1 text-green-700 dark:text-green-400'>
                {Math.round(Number(properties.confidence) * 100)}%
              </span>
            </div>
          )}
          {properties.class != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Type:</span>
              <span className='ml-1'>{courtInfo.name}</span>
            </div>
          )}
          {properties.zoom_level != null && (
            <div className='text-xs'>
              <span className='text-muted-foreground'>Detected at zoom:</span>
              <span className='ml-1'>{String(properties.zoom_level)}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </Popup>
  );
}
