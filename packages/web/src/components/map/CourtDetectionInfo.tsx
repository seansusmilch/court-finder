import { ConfidenceSlider } from './ConfidenceSlider';

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
    <div className='absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-md text-sm'>
      <div className='font-semibold'>Court Detection</div>
      <div className='text-xs text-blue-300'>
        Zoom level: {Math.round(zoomLevel)}
      </div>
      <div className='text-xs text-yellow-300 mt-1'>
        Pins visible from zoom {pinsVisibleFromZoom}+
      </div>

      <ConfidenceSlider
        confidenceThreshold={confidenceThreshold}
        onConfidenceChange={onConfidenceChange}
      />

      {isZoomSufficient ? (
        <>
          <div className='text-xs text-green-300 mt-1'>
            {courtCount} courts found
          </div>
          <div className='text-xs text-green-300 mt-1'>
            Showing ALL available court data
          </div>
          {availableZoomLevels && availableZoomLevels.length > 0 && (
            <div className='text-xs text-gray-300 mt-1'>
              Data from zoom levels: {availableZoomLevels.join(', ')}
            </div>
          )}
        </>
      ) : (
        <div className='text-xs text-red-300 mt-1'>
          Zoom in to see court pins
        </div>
      )}
    </div>
  );
}
