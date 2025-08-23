import { createFileRoute } from '@tanstack/react-router';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';

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
      >
        <Source id='detections' type='geojson' data={geojson} />
        <Layer
          id='detections-points'
          type='circle'
          source='detections'
          paint={{
            'circle-radius': 4,
            'circle-color': '#ff3b3b',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1,
          }}
        />
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
