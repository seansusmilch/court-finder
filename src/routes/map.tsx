import { createFileRoute } from '@tanstack/react-router';
import { CustomNavigationControls } from '@/components/map/CustomNavigationControls';
import Map, {
  ScaleControl,
} from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@/styles/mapbox.css';
import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useLocalStorage } from '@/hooks';
import { useAction, useQuery } from 'convex/react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@backend/_generated/api';
import { MAPBOX_TILE_DEFAULTS } from '@backend/lib/constants';
import type { MapMouseEvent } from 'mapbox-gl';
import { CourtPopup } from '@/components/map/CourtPopup';
import CourtClusters from '@/components/map/CourtClusters';
import { CourtMarker } from '@/components/map/CourtMarker';
import MapControls from '@/components/map/MapControls';
import { FloatingSearchBar } from '@/components/map/FloatingSearchBar';
import { CourtDetailSheet } from '@/components/map/CourtDetailSheet';
import {
  PINS_VISIBLE_FROM_ZOOM,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
  MAP_STYLE_SATELLITE,
  CLUSTER_MAX_ZOOM,
  MAPBOX_API_KEY,
  COURT_CLASS_VISUALS,
  LOCALSTORAGE_KEYS,
} from '@/lib/constants';
import type {
  MapViewState,
  GeoJSONFeatureCollection,
  SelectedPin,
  ViewportBbox,
  CourtFeatureProperties,
} from '@/lib/types';

interface MapSettings {
  confidenceThreshold: number;
  mapStyle: string;
  enabledCategories: string[] | null;
}

const EMPTY_FEATURE_COLLECTION: GeoJSONFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export const Route = createFileRoute('/map')({
  loader: () => ({
    defaultViewState: {
      longitude: DEFAULT_MAP_CENTER[0],
      latitude: DEFAULT_MAP_CENTER[1],
      zoom: DEFAULT_MAP_ZOOM,
    },
    defaultMapSettings: {
      confidenceThreshold: 0.5,
      mapStyle: MAP_STYLE_SATELLITE,
      enabledCategories: null,
    },
  }),
  component: MapPage,
});

function MapPage() {
  const mapRef = useRef<MapRef | null>(null);
  const loaderData = Route.useLoaderData() as {
    defaultViewState: MapViewState;
    defaultMapSettings: MapSettings;
  };

  // Use localStorage hooks for persistent state
  const [viewState, setViewState] = useLocalStorage<MapViewState>(
    LOCALSTORAGE_KEYS.MAP_VIEW_STATE,
    loaderData.defaultViewState
  );

  // Use individual localStorage hooks for each setting to avoid circular dependencies
  const [confidenceThreshold, setConfidenceThreshold] = useLocalStorage<number>(
    `${LOCALSTORAGE_KEYS.MAP_SETTINGS}_confidenceThreshold`,
    loaderData.defaultMapSettings.confidenceThreshold
  );
  const [mapStyle, setMapStyle] = useLocalStorage<string>(
    `${LOCALSTORAGE_KEYS.MAP_SETTINGS}_mapStyle`,
    loaderData.defaultMapSettings.mapStyle
  );
  const [enabledCategories, setEnabledCategories] = useLocalStorage<
    string[] | null
  >(
    `${LOCALSTORAGE_KEYS.MAP_SETTINGS}_enabledCategories`,
    loaderData.defaultMapSettings.enabledCategories
  );

  const [bbox, setBbox] = useState<ViewportBbox | null>(null);

  // We update state on move end, so no debouncing needed

  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const onClusterClick = useCallback((event: MapMouseEvent) => {
    const features = event.features;
    if (!features || features.length === 0) return;

    const clusterId = features[0].properties?.cluster_id as number | undefined;
    const mapboxSource = event.target.getSource('courts') as {
      getClusterExpansionZoom: (
        id: number,
        cb: (err: unknown, zoom: number) => void
      ) => void;
    } | null;

    if (!clusterId || !mapboxSource) return;

    mapboxSource.getClusterExpansionZoom(
      clusterId,
      (err: unknown, zoom: number) => {
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

    // Type assertion for properties - the convex query ensures this structure
    const properties = feature.properties as CourtFeatureProperties;

    setSelectedPin({
      longitude,
      latitude,
      properties,
    });
  }, []);

  const canScan = useQuery(api.users.hasPermission, {
    permission: 'scans.execute',
  }) as boolean | undefined;
  const canUpload = useQuery(api.users.hasPermission, {
    permission: 'admin.access',
  }) as boolean | undefined;
  const scanArea = useAction(api.actions.scanArea);
  const uploadCenterTile = useAction(api.upload_batches.uploadCenterTile);

  const scanMutation = useMutation({
    mutationKey: ['scanArea'],
    mutationFn: async () => {
      const center = mapRef.current?.getCenter?.();
      if (!center) throw new Error('Map center not available');
      return scanArea({ latitude: center.lat, longitude: center.lng });
    },
  });

  const uploadMutation = useMutation({
    mutationKey: ['uploadTile'],
    mutationFn: async () => {
      const center = mapRef.current?.getCenter?.();
      if (!center) throw new Error('Map center not available');

      return uploadCenterTile({
        latitude: center.lat,
        longitude: center.lng,
        zoom: MAPBOX_TILE_DEFAULTS.zoom,
      });
    },
    onSuccess: () => {
      setUploadSuccess(true);
      // Reset success state after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
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
  ) as GeoJSONFeatureCollection | undefined;

  const computeBbox = (map: {
    getBounds?: () =>
      | {
          getSouth: () => number;
          getWest: () => number;
          getNorth: () => number;
          getEast: () => number;
        }
      | undefined;
  }) => {
    const bounds = map?.getBounds?.();
    if (!bounds) return null;
    return {
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    } as NonNullable<typeof bbox>;
  };

  const onMoveEnd = useCallback(
    (evt: unknown) => {
      const { viewState, target } = evt as {
        viewState: MapViewState;
        target: {
          getBounds?: () =>
            | {
                getSouth: () => number;
                getWest: () => number;
                getNorth: () => number;
                getEast: () => number;
              }
            | null
            | undefined;
        };
      };
      setViewState(viewState);
      const newBbox = computeBbox({
        getBounds: () => target.getBounds?.() ?? undefined,
      });
      if (newBbox) setBbox(newBbox);
    },
    [setViewState]
  );

  // Keep previous pins visible during refetches to avoid flicker on pan/zoom/filters
  const [stableFeatureCollection, setStableFeatureCollection] =
    useState<GeoJSONFeatureCollection | null>(null);

  useEffect(() => {
    if (featureCollection) {
      setStableFeatureCollection(featureCollection);
    }
  }, [featureCollection]);

  const availableCategories = useMemo(() => {
    return Object.keys(COURT_CLASS_VISUALS).sort();
  }, []);

  const geojson = useMemo(() => {
    if (viewState.zoom < PINS_VISIBLE_FROM_ZOOM)
      return EMPTY_FEATURE_COLLECTION;
    const source =
      featureCollection ?? stableFeatureCollection ?? EMPTY_FEATURE_COLLECTION;
    if (enabledCategories === null) return source;
    if (enabledCategories.length === 0)
      return {
        type: 'FeatureCollection',
        features: [],
      } as GeoJSONFeatureCollection;
    const allowed = new Set(enabledCategories);
    return {
      type: 'FeatureCollection',
      features: source.features.filter((f) =>
        allowed.has(String(f.properties.class))
      ),
    } as GeoJSONFeatureCollection;
  }, [
    featureCollection,
    stableFeatureCollection,
    enabledCategories,
    viewState.zoom,
    PINS_VISIBLE_FROM_ZOOM,
  ]);

  return (
    <div className='h-[100vh] w-full relative'>
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_API_KEY}
        initialViewState={viewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle={mapStyle}
        onMoveEnd={onMoveEnd}
        onLoad={(e) => {
          const b = computeBbox({
            getBounds: () => e.target.getBounds?.() ?? undefined,
          });
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
        <ScaleControl />
        <CustomNavigationControls 
          mapRef={mapRef} 
          className="absolute bottom-24 right-4 md:bottom-8 z-50" 
        />
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
      </Map>

      {selectedPin && (
        <CourtDetailSheet
          open={!!selectedPin}
          onOpenChange={(open) => !open && setSelectedPin(null)}
          longitude={selectedPin.longitude}
          latitude={selectedPin.latitude}
          properties={selectedPin.properties}
        />
      )}

      <FloatingSearchBar
        accessToken={MAPBOX_API_KEY as string}
        mapRef={mapRef}
      />

      <MapControls
        className='absolute inset-0 pointer-events-none'
        mapRef={mapRef}
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
        mapStyle={mapStyle}
        onMapStyleChange={setMapStyle}
        categories={availableCategories}
        enabledCategories={enabledCategories ?? availableCategories}
        onCategoriesChange={(cats: string[]) => setEnabledCategories(cats)}
        canUpload={!!canUpload}
        onUpload={() => uploadMutation.mutate()}
        isUploading={uploadMutation.isPending}
        uploadSuccess={uploadSuccess}
      />
    </div>
  );
}
