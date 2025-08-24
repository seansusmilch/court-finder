import { createFileRoute } from '@tanstack/react-router';
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
import { useMemo, useState, useCallback, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@court-finder/backend/convex/_generated/api';
import type { MapMouseEvent } from 'mapbox-gl';
import { CourtPopup } from '@/components/map/CourtPopup';
import { CourtDetectionInfo } from '@/components/map/CourtDetectionInfo';
import { SearchBox } from '@/components/map/SearchBox';
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

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

async function getInitialViewStateViaGeolocation(): Promise<ViewState> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    return {
      longitude: DEFAULT_MAP_CENTER[0],
      latitude: DEFAULT_MAP_CENTER[1],
      zoom: DEFAULT_MAP_ZOOM,
    };
  }

  return new Promise<ViewState>((resolve) => {
    const timeoutId = window.setTimeout(() => {
      resolve({
        longitude: DEFAULT_MAP_CENTER[0],
        latitude: DEFAULT_MAP_CENTER[1],
        zoom: DEFAULT_MAP_ZOOM,
      });
    }, 3000);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(timeoutId);
        resolve({
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
          zoom: DEFAULT_MAP_ZOOM,
        });
      },
      () => {
        window.clearTimeout(timeoutId);
        resolve({
          longitude: DEFAULT_MAP_CENTER[0],
          latitude: DEFAULT_MAP_CENTER[1],
          zoom: DEFAULT_MAP_ZOOM,
        });
      },
      {
        enableHighAccuracy: false,
        maximumAge: 600000,
        timeout: 2500,
      }
    );
  });
}

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
};

type SelectedPin = {
  longitude: number;
  latitude: number;
  properties: Record<string, unknown>;
} | null;

const EMPTY_FEATURE_COLLECTION: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export const Route = createFileRoute('/map')({
  loader: async () => {
    return getInitialViewStateViaGeolocation();
  },
  component: MapPage,
});

function MapPage() {
  const mapRef = useRef<MapRef | null>(null);
  const initial = Route.useLoaderData() as ViewState;
  console.log('[initial]', initial);
  const [viewState, setViewState] = useState<ViewState>(initial);

  const [bbox, setBbox] = useState<{
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null>(null);

  // We update state on move end, so no debouncing needed

  const [selectedPin, setSelectedPin] = useState<SelectedPin>(null);

  const onClusterClick = useCallback((event: MapMouseEvent) => {
    const features = event.features;
    if (!features || features.length === 0) return;

    const clusterId = features[0].properties?.cluster_id;
    const mapboxSource = event.target.getSource('courts') as any;

    if (!clusterId || !mapboxSource) return;

    mapboxSource.getClusterExpansionZoom(
      clusterId,
      (err: any, zoom: number) => {
        if (err) return;
        event.target.easeTo({
          center: [event.lngLat.lng, event.lngLat.lat],
          zoom: zoom + 0.5,
          duration: 500,
        });
      }
    );
  }, []);

  const onPointClick = useCallback((event: MapMouseEvent) => {
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

  const model = INFER_MODEL;
  const version = INFER_VERSION;

  const availableZoomLevels = useQuery(api.inferences.getAvailableZoomLevels, {
    model,
    version,
  }) as number[] | undefined;

  const shouldQuery = Boolean(bbox && viewState.zoom >= PINS_VISIBLE_FROM_ZOOM);
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

  const computeBbox = (map: any) => {
    const bounds = map?.getBounds?.();
    if (!bounds) return null;
    return {
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    } as NonNullable<typeof bbox>;
  };

  const onMoveEnd = useCallback((evt: any) => {
    const { viewState: newViewState } = evt;
    setViewState(newViewState);
    const newBbox = computeBbox(evt.target);
    if (newBbox) setBbox(newBbox);
  }, []);

  const geojson = useMemo(() => {
    if (viewState.zoom < PINS_VISIBLE_FROM_ZOOM)
      return EMPTY_FEATURE_COLLECTION;
    return featureCollection ?? EMPTY_FEATURE_COLLECTION;
  }, [featureCollection, viewState.zoom, PINS_VISIBLE_FROM_ZOOM]);

  return (
    <div className='h-[calc(100vh-2rem)] w-full p-2 relative'>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_API_KEY}
        initialViewState={viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAP_STYLE_SATELLITE}
        onMoveEnd={onMoveEnd}
        onLoad={(e) => {
          const b = computeBbox(e.target);
          if (b) setBbox(b);
        }}
        interactiveLayerIds={['clusters', 'unclustered-points']}
        onClick={(e) => {
          const hasFeatures = e.features && e.features.length > 0;
          if (!hasFeatures) {
            setSelectedPin(null);
            return;
          }
          const layerId = e.features![0].layer?.id;
          if (layerId === 'clusters') onClusterClick(e);
          if (layerId === 'unclustered-points') onPointClick(e);
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
