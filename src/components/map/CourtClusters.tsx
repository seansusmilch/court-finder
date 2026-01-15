import { Source, Layer } from 'react-map-gl/mapbox';
import { CLUSTER_MAX_ZOOM, CLUSTER_RADIUS } from '@/lib/constants';

type FeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: Record<string, unknown>;
  }>;
};

interface CourtClustersProps {
  id?: string;
  data: FeatureCollection;
  mapLoaded?: boolean;
}

export function CourtClusters({ id = 'courts', data, mapLoaded = false }: CourtClustersProps) {
  if (!mapLoaded) {
    return null;
  }

  return (
    <Source
      id={id}
      type='geojson'
      data={data}
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
      </Source>
  );
}

export default CourtClusters;
