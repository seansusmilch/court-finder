import { fireEvent, render, screen } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { describe, expect, it, vi } from 'vitest';
import { MapControls } from './MapControls';

function createMapRef() {
  return { current: null } as MutableRefObject<MapRef | null>;
}

function createSettings() {
  return {
    courtCount: 3,
    isZoomSufficient: true,
    categories: ['basketball-court', 'tennis-court'],
    enabledCategories: null,
    onCategoriesChange: vi.fn(),
    confidenceThreshold: 0.5,
    onConfidenceChange: vi.fn(),
    verifiedOnly: false,
    onVerifiedOnlyChange: vi.fn(),
    mapStyle: 'mapbox://styles/mapbox/standard-satellite',
    onMapStyleChange: vi.fn(),
    scan: {
      onScan: vi.fn(),
      isScanning: false,
      scanProgress: null,
    },
  };
}

describe('MapControls', () => {
  it('toggles the anchored filter panel from the stack control', () => {
    render(<MapControls mapRef={createMapRef()} settings={createSettings()} />);

    const filterButtons = screen.getAllByRole('button', { name: 'Open map filters' });
    expect(filterButtons[0]).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(filterButtons[0]);

    expect(filterButtons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Map filters and display' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan area for possible facilities' })).toBeInTheDocument();

    fireEvent.click(filterButtons[0]);
    expect(filterButtons[0]).toHaveAttribute('aria-expanded', 'false');
  });
});
