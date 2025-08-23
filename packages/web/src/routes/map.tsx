import { createFileRoute } from '@tanstack/react-router';
import Map, { Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMemo, useState, useCallback } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import { CourtPopup } from '@/components/map/CourtPopup';
import { CourtDetectionInfo } from '@/components/map/CourtDetectionInfo';
import type { MapboxEvent, MapLayerMouseEvent } from 'mapbox-gl';

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

  // Handle cluster clicks - zoom in to show individual markers
  const handleClusterClick = useCallback((event: MapLayerMouseEvent) => {
    const features = event.features;
    if (!features || features.length === 0) return;

    const clusterId = features[0].properties?.cluster_id;
    const mapboxSource = event.target.getSource('courts') as any;

    if (clusterId && mapboxSource) {
      // Get the cluster expansion zoom
      mapboxSource.getClusterExpansionZoom(
        clusterId,
        (err: any, zoom: number) => {
          if (err) return;

          event.target.easeTo({
            center: [event.lngLat.lng, event.lngLat.lat],
            zoom: zoom + 0.5, // Add some padding
            duration: 500,
          });
        }
      );
    }
  }, []);

  // Handle individual point clicks
  const handlePointClick = useCallback((event: MapLayerMouseEvent) => {
    event.originalEvent.stopPropagation();
    const features = event.features;
    if (!features || features.length === 0) return;

    const feature = features[0];
    const geometry = feature.geometry as {
      type: 'Point';
      coordinates: [number, number];
    };
    const [longitude, latitude] = geometry.coordinates;

    setSelectedPin({
      longitude,
      latitude,
      properties: feature.properties || {},
    });
  }, []);

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
        interactiveLayerIds={['clusters', 'unclustered-points']}
        onClick={(e) => {
          // Handle map clicks and layer clicks
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.layer?.id === 'clusters') {
              handleClusterClick(e);
            } else if (feature.layer?.id === 'unclustered-points') {
              handlePointClick(e);
            }
          } else {
            // Click on empty map area
            setSelectedPin(null);
          }
        }}
      >
        <Source
          id='courts'
          type='geojson'
          data={geojson}
          cluster={true}
          clusterMaxZoom={14}
          clusterRadius={50}
        >
          {/* Cluster circles */}
          <Layer
            id='clusters'
            type='circle'
            filter={['has', 'point_count']}
            paint={{
              'circle-color': [
                'step',
                ['get', 'point_count'],
                '#51bbd6',
                100,
                '#f1f075',
                750,
                '#f28cb1',
              ],
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                20,
                100,
                30,
                750,
                40,
              ],
            }}
          />

          {/* Cluster count labels */}
          <Layer
            id='cluster-count'
            type='symbol'
            filter={['has', 'point_count']}
            layout={{
              'text-field': '{point_count_abbreviated}',
              'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
              'text-size': 12,
            }}
            paint={{
              'text-color': '#ffffff',
            }}
          />

          {/* Unclustered court points */}
          <Layer
            id='unclustered-points'
            type='circle'
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': '#ff0000',
              'circle-radius': 8,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>

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
