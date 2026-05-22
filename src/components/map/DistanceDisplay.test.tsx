import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistanceDisplay } from './DistanceDisplay';

describe('DistanceDisplay', () => {
  it('shows loading text while location is being requested', () => {
    render(
      <DistanceDisplay
        loading
        userLocation={null}
        latitude={41.8781}
        longitude={-87.6298}
      />
    );

    expect(screen.getByText('Getting your location...')).toBeInTheDocument();
  });

  it('prompts for location when unavailable', () => {
    render(
      <DistanceDisplay
        userLocation={null}
        latitude={41.8781}
        longitude={-87.6298}
      />
    );

    expect(screen.getByText('Enable location to see distance')).toBeInTheDocument();
  });

  it('renders formatted distance from the user location', () => {
    render(
      <DistanceDisplay
        userLocation={{
          latitude: 41.8781,
          longitude: -87.6298,
        }}
        latitude={42.0451}
        longitude={-87.6877}
      />
    );

    expect(screen.getByText('11.9 mi away')).toBeInTheDocument();
  });
});
