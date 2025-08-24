import { createFileRoute, useSearch, redirect } from '@tanstack/react-router';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@backend/_generated/api';
import type { Id } from '@backend/_generated/dataModel';
import { ScanDetails, ScanList } from '@/components/scans';
import { reverseGeocode } from '@/lib/geocoding';

type ScanResult = {
  scanId: string;
  zoom: number | null;
  cols: number;
  rows: number;
  tiles: Array<{
    z: number;
    x: number;
    y: number;
    url: string;
    detections: unknown;
  }>;
};

export const Route = createFileRoute('/scans')({
  component: ScansPage,
  beforeLoad: async ({ context }) => {
    if (!context.me)
      throw redirect({ to: '/login', search: { redirect: '/scans' } });
  },
});

function ScansPage() {
  const search = useSearch({ from: '/scans' }) as { scanId?: string };
  const scanId = (search.scanId as Id<'scans'> | undefined) ?? undefined;
  const scanResult = useQuery(
    api.scanResults.getByScanId,
    scanId ? { scanId } : 'skip'
  ) as ScanResult | undefined;
  const scans = useQuery(api.scans.listAll, {});
  const [searchQuery, setSearchQuery] = useState('');
  const [locationNames, setLocationNames] = useState<Record<string, string>>(
    {}
  );

  // Geocode scan locations
  useEffect(() => {
    if (scans) {
      scans.forEach(async (scan) => {
        const key = `${scan.centerLat},${scan.centerLong}`;
        if (!locationNames[key]) {
          const locationName = await reverseGeocode(
            scan.centerLat,
            scan.centerLong
          );
          setLocationNames((prev) => ({ ...prev, [key]: locationName }));
        }
      });
    }
  }, [scans, locationNames]);

  // Filter scans based on search query
  const filteredScans = useMemo(() => {
    if (!scans || !searchQuery.trim()) return scans;

    const query = searchQuery.toLowerCase();
    return scans.filter(
      (scan) =>
        scan.centerLat.toString().includes(query) ||
        scan.centerLong.toString().includes(query) ||
        scan.tileCount.toString().includes(query) ||
        new Date(scan.createdAt)
          .toLocaleDateString()
          .toLowerCase()
          .includes(query) ||
        (locationNames[`${scan.centerLat},${scan.centerLong}`] || '')
          .toLowerCase()
          .includes(query)
    );
  }, [scans, searchQuery, locationNames]);

  // If viewing a specific scan, show scan details
  if (scanId) {
    if (!scanResult) {
      return (
        <div className='container mx-auto max-w-7xl px-4 py-4'>
          <div className='mb-6 flex items-center gap-4'>
            <div className='text-muted-foreground'>Loading scan details...</div>
          </div>
        </div>
      );
    }

    return <ScanDetails scanResult={scanResult} />;
  }

  // Main scans list view
  return (
    <ScanList
      scans={scans || []}
      filteredScans={filteredScans || []}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      locationNames={locationNames}
      isLoading={!scans}
    />
  );
}
