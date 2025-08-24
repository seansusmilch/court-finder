import { createFileRoute, useNavigate } from '@tanstack/react-router';
import Map, {
  Source,
  Layer,
  GeolocateControl,
  FullscreenControl,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import { CourtPopup } from '@/components/map/CourtPopup';
import { CourtDetectionInfo } from '@/components/map/CourtDetectionInfo';
import { SearchBox } from '@/components/map/SearchBox';
import type { MapMouseEvent } from 'mapbox-gl';
import {
  PINS_VISIBLE_FROM_ZOOM,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_STYLE_SATELLITE,
  CLUSTER_MAX_ZOOM,
  CLUSTER_RADIUS,
  SEARCH_FLY_TO_ZOOM,
  FLY_TO_DURATION_MS,
  INFER_MODEL,
  INFER_VERSION,
} from '@/lib/constants';

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
  validateSearch: (search: Record<string, unknown>) => {
    const parseNumber = (v: unknown) =>
      typeof v === 'number'
        ? v
        : typeof v === 'string'
        ? parseFloat(v)
        : undefined;

    const lon = parseNumber((search as any).longitude);
    const lat = parseNumber((search as any).latitude);
    const zm = parseNumber((search as any).zoom);

    return {
      longitude: Number.isFinite(lon) ? (lon as number) : DEFAULT_MAP_CENTER[0],
      latitude: Number.isFinite(lat) ? (lat as number) : DEFAULT_MAP_CENTER[1],
      zoom: Number.isFinite(zm) ? (zm as number) : DEFAULT_MAP_ZOOM,
    };
  },
  component: MapPage,
});

function MapPage() {
  const search = Route.useSearch();
  const mapRef = useRef<MapRef | null>(null);
  const navigate = useNavigate({ from: Route.fullPath });

  // Configurable zoom level where pins start showing

  const [viewState, setViewState] = useState({
    longitude: search.longitude,
    latitude: search.latitude,
    zoom: search.zoom,
  });

  const [bbox, setBbox] = useState<{
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null>(null);

  const moveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (moveTimeoutRef.current) {
        clearTimeout(moveTimeoutRef.current);
      }
    };
  }, []);

  const [selectedPin, setSelectedPin] = useState<{
    longitude: number;
    latitude: number;
    properties: Record<string, unknown>;
  } | null>(null);

  // Handle cluster clicks - zoom in to show individual markers
  const handleClusterClick = useCallback((event: MapMouseEvent) => {
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
  const handlePointClick = useCallback((event: MapMouseEvent) => {
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
  const model = INFER_MODEL;
  const version = INFER_VERSION;

  // Get available zoom levels from database
  const availableZoomLevels = useQuery(api.inferences.getAvailableZoomLevels, {
    model,
    version,
  }) as number[] | undefined;

  // Skip DB query when zoom is below threshold
  const shouldQuery = bbox && viewState.zoom >= PINS_VISIBLE_FROM_ZOOM;
  const featureCollection = useQuery(
    api.inferences.featuresByViewport,
    shouldQuery
      ? {
          bbox: bbox as NonNullable<typeof bbox>,
          zoom: viewState.zoom,
          model,
          version,
          confidenceThreshold,
        }
      : 'skip'
  ) as FeatureCollection | undefined;

  const onMove = useCallback((evt: any) => {
    const { viewState: newViewState } = evt;

    const bounds = evt.target?.getBounds?.();
    const newBbox = bounds
      ? {
          minLat: bounds.getSouth(),
          minLng: bounds.getWest(),
          maxLat: bounds.getNorth(),
          maxLng: bounds.getEast(),
        }
      : null;

    if (moveTimeoutRef.current) {
      clearTimeout(moveTimeoutRef.current);
    }

    moveTimeoutRef.current = setTimeout(() => {
      console.log('[onMove]');
      setViewState(newViewState);
      if (newBbox) {
        setBbox(newBbox);
      }
    }, 150);
  }, []);

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
        ref={mapRef}
        mapboxAccessToken={MAPBOX_API_KEY}
        initialViewState={viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE_SATELLITE}
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
        <GeolocateControl position='top-left' />
        <FullscreenControl position='top-left' />
        <NavigationControl position='top-left' />
        <ScaleControl />
        {viewState.zoom >= PINS_VISIBLE_FROM_ZOOM && (
          <Source
            id='courts'
            type='geojson'
            data={geojson}
            cluster={true}
            clusterMaxZoom={CLUSTER_MAX_ZOOM}
            clusterRadius={CLUSTER_RADIUS}
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
        )}

        {selectedPin && (
          <CourtPopup
            longitude={selectedPin.longitude}
            latitude={selectedPin.latitude}
            properties={selectedPin.properties}
            onClose={() => setSelectedPin(null)}
          />
        )}
      </Map>

      <div className='absolute top-4 left-15 z-50'>
        <SearchBox
          apiKey={MAPBOX_API_KEY}
          onSelect={(lng, lat) => {
            mapRef.current?.easeTo({
              center: [lng, lat],
              zoom: SEARCH_FLY_TO_ZOOM,
              duration: FLY_TO_DURATION_MS,
            });
          }}
        />
      </div>

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
