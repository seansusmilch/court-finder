import { render, screen, within } from '@testing-library/react';
import type { ReactElement, MutableRefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultButtons,
  CustomNavigationControls,
} from './CustomNavigationControls';

function createMapRef() {
  return {
    current: {
      flyTo: vi.fn(),
      easeTo: vi.fn(),
    },
  } as unknown as MutableRefObject<MapRef | null>;
}

const originalGeolocation = navigator.geolocation;

afterEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: originalGeolocation,
  });
});

describe('CustomNavigationControls', () => {
  it('configures the compass bearing and expanded filter state', () => {
    const mapRef = createMapRef();
    const buttons = createDefaultButtons(mapRef, {
      bearing: 32,
      settingsOpen: true,
      onSettingsClick: vi.fn(),
    }).filter((button) => button.show !== false);

    expect(buttons.map((button) => button.id)).toEqual(['locate', 'compass']);

    const settings = createDefaultButtons(mapRef, {
      bearing: 32,
      settingsOpen: true,
      onSettingsClick: vi.fn(),
    }).find((button) => button.id === 'settings');
    expect(settings?.ariaExpanded).toBe(true);

    const compassIcon = buttons[1].icon as ReactElement<{ style?: React.CSSProperties }>;
    expect(compassIcon.props.style).toEqual({ transform: 'rotate(-32deg)' });
  });

  it('resets bearing and pitch with a short map animation', () => {
    const mapRef = createMapRef();
    const compass = createDefaultButtons(mapRef).find((button) => button.id === 'compass');

    compass?.onClick();

    expect(mapRef.current?.easeTo).toHaveBeenCalledWith({
      bearing: 0,
      pitch: 0,
      duration: 250,
    });
  });

  it('centers on the current location and reports the locating lifecycle', () => {
    const mapRef = createMapRef();
    const onLocateStart = vi.fn();
    const onLocateEnd = vi.fn();
    const getCurrentPosition = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 44.95,
          longitude: -93.09,
        } as GeolocationCoordinates,
      } as GeolocationPosition);
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    const locate = createDefaultButtons(mapRef, {
      onLocateStart,
      onLocateEnd,
    }).find((button) => button.id === 'locate');

    locate?.onClick();

    expect(onLocateStart).toHaveBeenCalledOnce();
    expect(onLocateEnd).toHaveBeenCalledOnce();
    expect(mapRef.current?.flyTo).toHaveBeenCalledWith({
      center: [-93.09, 44.95],
      zoom: 14,
    });
  });

  it('ends the locating lifecycle when geolocation is denied', () => {
    const mapRef = createMapRef();
    const onLocateStart = vi.fn();
    const onLocateEnd = vi.fn();
    const getCurrentPosition = vi.fn(
      (_success: PositionCallback, error?: PositionErrorCallback) => {
        error?.({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
      }
    );

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    const locate = createDefaultButtons(mapRef, {
      onLocateStart,
      onLocateEnd,
    }).find((button) => button.id === 'locate');

    locate?.onClick();

    expect(onLocateStart).toHaveBeenCalledOnce();
    expect(onLocateEnd).toHaveBeenCalledOnce();
    expect(mapRef.current?.flyTo).not.toHaveBeenCalled();
  });

  it('does not start locating when the browser has no geolocation support', () => {
    const mapRef = createMapRef();
    const onLocateStart = vi.fn();

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });

    const locate = createDefaultButtons(mapRef, { onLocateStart }).find(
      (button) => button.id === 'locate'
    );

    locate?.onClick();

    expect(onLocateStart).not.toHaveBeenCalled();
    expect(mapRef.current?.flyTo).not.toHaveBeenCalled();
  });

  it('renders the expanded state and compass rotation accessibly', () => {
    const mapRef = createMapRef();

    render(
      <CustomNavigationControls
        mapRef={mapRef}
        showSettings
        settingsOpen
        bearing={45}
      />
    );

    const group = screen.getByRole('group', { name: 'Map controls' });
    const buttons = within(group).getAllByRole('button');

    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Close map filters',
      'Reset bearing',
      'Locate me',
    ]);
    expect(buttons[0]).toHaveAttribute('aria-expanded', 'true');
    expect(buttons[1].querySelector('svg')).toHaveStyle({
      transform: 'rotate(-45deg)',
    });
  });
});
