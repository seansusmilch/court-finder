import { ConfidenceSlider } from './ConfidenceSlider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CourtDetectionInfoProps {
  zoomLevel: number;
  pinsVisibleFromZoom: number;
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
  courtCount: number;
  availableZoomLevels?: number[];
  isZoomSufficient: boolean;
}

export function CourtDetectionInfo({
  zoomLevel,
  pinsVisibleFromZoom,
  confidenceThreshold,
  onConfidenceChange,
  courtCount,
  availableZoomLevels,
  isZoomSufficient,
}: CourtDetectionInfoProps) {
  return (
    <div className='absolute top-4 right-4 text-sm'>
      <Card className='bg-background/90 backdrop-blur shadow-sm min-w-64'>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Court Detection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-xs text-muted-foreground'>
            Zoom level: {Math.round(zoomLevel)}
          </div>
          <div className='text-xs text-yellow-600 dark:text-yellow-400 mt-1'>
            Pins visible from zoom {pinsVisibleFromZoom}+
          </div>

          <ConfidenceSlider
            confidenceThreshold={confidenceThreshold}
            onConfidenceChange={onConfidenceChange}
          />

          {isZoomSufficient ? (
            <>
              <div className='text-xs text-green-700 dark:text-green-400 mt-1'>
                {courtCount} courts found
              </div>
              <div className='text-xs text-green-700 dark:text-green-400 mt-1'>
                Showing ALL available court data
              </div>
              {availableZoomLevels && availableZoomLevels.length > 0 && (
                <div className='text-xs text-muted-foreground mt-1'>
                  Data from zoom levels: {availableZoomLevels.join(', ')}
                </div>
              )}
            </>
          ) : (
            <div className='text-xs text-destructive mt-1'>
              Zoom in to see court pins
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
