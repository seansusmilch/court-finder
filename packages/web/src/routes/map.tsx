import { createFileRoute } from '@tanstack/react-router';
import Map, { Source, Layer, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import { Activity } from 'lucide-react';

const MAPBOX_API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
};

export const Route = createFileRoute('/map')({
  component: MapPage,
});

function MapPage() {
  const initialCenter: [number, number] = [-87.6952, 41.9442];

  // Configurable zoom level where pins start showing
  const PINS_VISIBLE_FROM_ZOOM = 12;

  const [viewState, setViewState] = useState({
    longitude: initialCenter[0],
    latitude: initialCenter[1],
    zoom: 15,
  });

  const [bbox, setBbox] = useState<{
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null>(null);

  const [selectedPin, setSelectedPin] = useState<{
    longitude: number;
    latitude: number;
    properties: Record<string, unknown>;
  } | null>(null);

  const [confidenceThreshold, setConfidenceThreshold] = useState(0.5);

  // Hardcode model/version for now to match backend action
  const model = 'satellite-sports-facilities-bubrg';
  const version = '4';

  // Get available zoom levels from database
  const availableZoomLevels = useQuery(api.inferences.getAvailableZoomLevels, {
    model,
    version,
  }) as number[] | undefined;

  // Show ALL court data regardless of zoom level
  const featureCollection = useQuery(
    api.inferences.featuresByViewport,
    bbox
      ? {
          bbox,
          zoom: viewState.zoom, // Still needed for viewport calculation, but backend uses ALL zoom levels
          model,
          version,
          confidenceThreshold,
        }
      : 'skip'
  ) as FeatureCollection | undefined;

  const onMove = (evt: any) => {
    const { viewState: newViewState } = evt;
    setViewState(newViewState);

    // Calculate bbox from view state
    const bounds = evt.target?.getBounds?.();
    if (bounds) {
      const newBbox = {
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
      };
      setBbox(newBbox);
    }
  };

  const geojson = useMemo(() => {
    // Only show pins if zoom level is above the threshold
    if (viewState.zoom < PINS_VISIBLE_FROM_ZOOM) {
      return { type: 'FeatureCollection' as const, features: [] };
    }
    return (
      featureCollection ?? { type: 'FeatureCollection' as const, features: [] }
    );
  }, [featureCollection, viewState.zoom, PINS_VISIBLE_FROM_ZOOM]);

  return (
    <div className='h-[calc(100vh-2rem)] w-full p-2 relative'>
      <Map
        mapboxAccessToken={MAPBOX_API_KEY}
        initialViewState={viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle='mapbox://styles/mapbox/satellite-v9'
        onMove={onMove}
        onClick={() => setSelectedPin(null)}
      >
        {geojson.features.map((feature, index) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          const properties = feature.properties;

          return (
            <Marker
              key={index}
              longitude={longitude}
              latitude={latitude}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedPin({
                  longitude,
                  latitude,
                  properties,
                });
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className='relative group'>
                <div className='bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors duration-200 hover:scale-110 transform'>
                  <Activity size={16} />
                </div>
                {/* Tooltip on hover */}
                <div className='absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap'>
                  Click for details
                </div>
              </div>
            </Marker>
          );
        })}

        {selectedPin && (
          <Popup
            longitude={selectedPin.longitude}
            latitude={selectedPin.latitude}
            onClose={() => setSelectedPin(null)}
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
                    {selectedPin.latitude.toFixed(6)},{' '}
                    {selectedPin.longitude.toFixed(6)}
                  </div>
                </div>
                {selectedPin.properties.confidence != null && (
                  <div>
                    <span className='font-medium'>Confidence:</span>
                    <span className='ml-1 text-green-600'>
                      {Math.round(
                        Number(selectedPin.properties.confidence) * 100
                      )}
                      %
                    </span>
                  </div>
                )}
                {selectedPin.properties.class != null && (
                  <div>
                    <span className='font-medium'>Type:</span>
                    <span className='ml-1 capitalize'>
                      {String(selectedPin.properties.class)}
                    </span>
                  </div>
                )}
                {selectedPin.properties.zoom_level != null && (
                  <div>
                    <span className='font-medium'>Detected at zoom:</span>
                    <span className='ml-1'>
                      {String(selectedPin.properties.zoom_level)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Popup>
        )}
      </Map>

      {/* Court detection info */}
      <div className='absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-md text-sm'>
        <div className='font-semibold'>Court Detection</div>
        <div className='text-xs text-blue-300'>
          Zoom level: {Math.round(viewState.zoom)}
        </div>
        <div className='text-xs text-yellow-300 mt-1'>
          Pins visible from zoom {PINS_VISIBLE_FROM_ZOOM}+
        </div>

        {/* Confidence threshold slider */}
        <div className='mt-2'>
          <div className='text-xs text-gray-300 mb-1'>
            Confidence: {Math.round(confidenceThreshold * 100)}%
          </div>
          <input
            type='range'
            min='0'
            max='1'
            step='0.1'
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className='w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider'
          />
        </div>

        {viewState.zoom >= PINS_VISIBLE_FROM_ZOOM ? (
          <>
            <div className='text-xs text-green-300 mt-1'>
              {geojson.features.length} courts found
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
    </div>
  );
}
