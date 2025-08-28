import { createFileRoute } from '@tanstack/react-router';
import Map, {
  GeolocateControl,
  FullscreenControl,
  ScaleControl,
  NavigationControl,
} from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/styles/mapbox.css';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@backend/_generated/api';
import type { MapMouseEvent } from 'mapbox-gl';
import { CourtPopup } from '@/components/map/CourtPopup';
import CourtClusters from '@/components/map/CourtClusters';
import { CourtMarker } from '@/components/map/CourtMarker';
import MapControls from '@/components/map/MapControls';
import {
  PINS_VISIBLE_FROM_ZOOM,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_STYLE_SATELLITE,
  CLUSTER_MAX_ZOOM,
  FLY_TO_DURATION_MS,
  MAPBOX_API_KEY,
} from '@/lib/constants';

type ViewState = {
  longitude: number;
  latitude: number;
  zoom: number;
};

const MAP_VIEW_STATE_KEY = 'map.viewState';

function getInitialViewState(): ViewState {
  if (typeof window === 'undefined') {
    return {
      longitude: DEFAULT_MAP_CENTER[0],
      latitude: DEFAULT_MAP_CENTER[1],
      zoom: DEFAULT_MAP_ZOOM,
    };
  }
  try {
    const raw = window.localStorage.getItem(MAP_VIEW_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ViewState>;
      if (
        typeof parsed.longitude === 'number' &&
        typeof parsed.latitude === 'number' &&
        typeof parsed.zoom === 'number'
      ) {
        return {
          longitude: parsed.longitude,
          latitude: parsed.latitude,
          zoom: parsed.zoom,
        };
      }
    }
  } catch {}
  return {
    longitude: DEFAULT_MAP_CENTER[0],
    latitude: DEFAULT_MAP_CENTER[1],
    zoom: DEFAULT_MAP_ZOOM,
  };
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
  loader: () => getInitialViewState(),
  component: MapPage,
});

function MapPage() {
  const mapRef = useRef<MapRef | null>(null);
  const initial = Route.useLoaderData() as ViewState;
  const [viewState, setViewState] = useState<ViewState>(initial);
  const hasAutoGeolocatedRef = useRef(false);

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

  const canScan = useQuery(api.users.hasPermission, {
    permission: 'scans.execute',
  }) as boolean | undefined;
  const scanArea = useAction(api.actions.scanArea);

  const scanMutation = useMutation({
    mutationKey: ['scanArea'],
    mutationFn: async () => {
      const center = mapRef.current?.getCenter?.();
      if (!center) throw new Error('Map center not available');
      return scanArea({ latitude: center.lat, longitude: center.lng });
    },
  });

  const availableZoomLevels = useQuery(
    api.inferences.getAvailableZoomLevels,
    {}
  ) as number[] | undefined;

  const shouldQuery = Boolean(bbox && viewState.zoom >= PINS_VISIBLE_FROM_ZOOM);
  const featureCollection = useQuery(
    api.inferences.featuresByViewport,
    shouldQuery
      ? {
          bbox: bbox as NonNullable<typeof bbox>,
          zoom: viewState.zoom,
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
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          MAP_VIEW_STATE_KEY,
          JSON.stringify({
            longitude: newViewState.longitude,
            latitude: newViewState.latitude,
            zoom: newViewState.zoom,
          })
        );
      }
    } catch {}
    const newBbox = computeBbox(evt.target);
    if (newBbox) setBbox(newBbox);
  }, []);

  useEffect(() => {
    if (hasAutoGeolocatedRef.current) return;
    hasAutoGeolocatedRef.current = true;
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [
          pos.coords.longitude,
          pos.coords.latitude,
        ];
        if (mapRef.current) {
          mapRef.current.easeTo({
            center: coords,
            zoom: Math.max(viewState.zoom, DEFAULT_MAP_ZOOM),
            duration: FLY_TO_DURATION_MS,
          });
        }
      },
      () => {
        // ignore errors; we already have a sensible initial view
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000,
      }
    );
  }, []);

  const geojson = useMemo(() => {
    if (viewState.zoom < PINS_VISIBLE_FROM_ZOOM)
      return EMPTY_FEATURE_COLLECTION;
    return featureCollection ?? EMPTY_FEATURE_COLLECTION;
  }, [featureCollection, viewState.zoom, PINS_VISIBLE_FROM_ZOOM]);

  return (
    <div className='h-[calc(100vh-3rem)] w-full relative'>
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
        interactiveLayerIds={['clusters']}
        onClick={(e) => {
          const hasFeatures = e.features && e.features.length > 0;
          if (!hasFeatures) {
            setSelectedPin(null);
            return;
          }
          const layerId = e.features![0].layer?.id;
          if (layerId === 'clusters') onClusterClick(e);
        }}
      >
        <GeolocateControl
          position='top-left'
          trackUserLocation
          showUserHeading
          showUserLocation
          positionOptions={{
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 10000,
          }}
        />
        <FullscreenControl position='top-left' />
        <NavigationControl position='top-left' />
        <ScaleControl />
        {viewState.zoom >= PINS_VISIBLE_FROM_ZOOM &&
          viewState.zoom <= CLUSTER_MAX_ZOOM && (
            <CourtClusters data={geojson} />
          )}

        {/* Render individual emoji markers when sufficiently zoomed-in to avoid clutter */}
        {viewState.zoom > CLUSTER_MAX_ZOOM &&
          geojson.features.map((f, idx) => {
            const geometry = f.geometry as {
              type: 'Point';
              coordinates: [number, number];
            };
            const [lng, lat] = geometry.coordinates;
            return (
              <CourtMarker
                key={`court-${idx}-${lng}-${lat}`}
                longitude={lng}
                latitude={lat}
                properties={f.properties}
                onClick={(longitude, latitude, properties) =>
                  setSelectedPin({ longitude, latitude, properties })
                }
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

      <MapControls
        className='absolute inset-0 pointer-events-none'
        mapRef={mapRef}
        accessToken={MAPBOX_API_KEY as string}
        zoomLevel={viewState.zoom}
        pinsVisibleFromZoom={PINS_VISIBLE_FROM_ZOOM}
        confidenceThreshold={confidenceThreshold}
        onConfidenceChange={setConfidenceThreshold}
        courtCount={geojson.features.length}
        availableZoomLevels={availableZoomLevels}
        isZoomSufficient={viewState.zoom >= PINS_VISIBLE_FROM_ZOOM}
        canScan={!!canScan}
        onScan={() => scanMutation.mutate()}
        isScanning={scanMutation.isPending}
      />
    </div>
  );
}
