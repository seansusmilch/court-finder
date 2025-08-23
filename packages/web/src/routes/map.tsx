import { createFileRoute } from '@tanstack/react-router';
import Map from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import { CourtMarker } from '@/components/map/CourtMarker';
import { CourtPopup } from '@/components/map/CourtPopup';
import { CourtDetectionInfo } from '@/components/map/CourtDetectionInfo';

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
            <CourtMarker
              key={index}
              longitude={longitude}
              latitude={latitude}
              properties={properties}
              onClick={(lon, lat, props) => {
                setSelectedPin({
                  longitude: lon,
                  latitude: lat,
                  properties: props,
                });
              }}
            />
          );
        })}

        {selectedPin && (
          <CourtPopup
            longitude={selectedPin.longitude}
            latitude={selectedPin.latitude}
            properties={selectedPin.properties}
            onClose={() => setSelectedPin(null)}
          />
        )}
      </Map>

      <CourtDetectionInfo
        zoomLevel={viewState.zoom}
        pinsVisibleFromZoom={PINS_VISIBLE_FROM_ZOOM}
        confidenceThreshold={confidenceThreshold}
        onConfidenceChange={setConfidenceThreshold}
        courtCount={geojson.features.length}
        availableZoomLevels={availableZoomLevels}
        isZoomSufficient={viewState.zoom >= PINS_VISIBLE_FROM_ZOOM}
      />
    </div>
  );
}
