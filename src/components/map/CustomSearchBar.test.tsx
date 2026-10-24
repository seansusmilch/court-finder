import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MutableRefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomSearchBar } from './CustomSearchBar';

const search = vi.hoisted(() => ({ suggest: vi.fn(), retrieve: vi.fn() }));
vi.mock('@mapbox/search-js-react', () => ({ useSearchBoxCore: () => search }));

const suggestions = [
  { mapbox_id: 'saint-paul', name: 'Saint Paul', feature_type: 'place', full_address: 'Minnesota, United States' },
  { mapbox_id: 'saint-peter', name: 'Saint Peter', feature_type: 'place', full_address: 'Minnesota, United States' },
];
const locationResponse = {
  features: [{ properties: { coordinates: { longitude: -93.09, latitude: 44.95 } } }],
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function setup() {
  const easeTo = vi.fn();
  const mapRef = { current: { easeTo } } as unknown as MutableRefObject<MapRef | null>;
  const view = render(<CustomSearchBar accessToken='test-token' mapRef={mapRef} />);
  const input = screen.getByRole('combobox', { name: 'Search locations' });
  act(() => input.focus());
  return { ...view, input, easeTo };
}

function typeQuery(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

async function finishDebounce() {
  await act(() => vi.advanceTimersByTimeAsync(300));
}

beforeEach(() => {
  vi.useFakeTimers();
  search.suggest.mockReset().mockResolvedValue({ suggestions });
  search.retrieve.mockReset().mockResolvedValue(locationResponse);
  // jsdom has no scrolling layout; keyboard selection still needs to run.
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});

describe('CustomSearchBar', () => {
  it('stays closed until there are two non-whitespace characters', async () => {
    const { input } = setup();
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    typeQuery(input, '  a  ');
    await finishDebounce();

    expect(search.suggest).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-busy', 'false');
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('waits for typing to pause and only searches the latest trimmed query', async () => {
    const { input } = setup();
    typeQuery(input, 'Sa');
    await act(() => vi.advanceTimersByTimeAsync(200));
    typeQuery(input, ' Saint Paul ');
    await act(() => vi.advanceTimersByTimeAsync(299));
    expect(search.suggest).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(search.suggest).toHaveBeenCalledOnce();
    expect(search.suggest).toHaveBeenCalledWith('Saint Paul', expect.objectContaining({
      limit: 8,
      signal: expect.any(AbortSignal),
    }));
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('2 location suggestions available');
  });

  it.each(['resolve', 'reject'] as const)('ignores an older request that %ss after newer results', async (outcome) => {
    const old = deferred<{ suggestions: typeof suggestions }>();
    search.suggest.mockReturnValueOnce(old.promise);
    const { input } = setup();
    typeQuery(input, 'Old');
    await finishDebounce();
    const oldSignal = search.suggest.mock.calls[0][1].signal as AbortSignal;

    typeQuery(input, 'Saint');
    expect(oldSignal.aborted).toBe(true);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    await finishDebounce();
    await act(async () => {
      if (outcome === 'resolve') old.resolve({ suggestions: [{ ...suggestions[0], name: 'Old result' }] });
      else old.reject(new Error('Old request failed'));
    });

    expect(screen.getByRole('option', { name: /Saint Paul/ })).toBeInTheDocument();
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-busy', 'false');
  });

  it('clears an in-flight search without letting its response reopen suggestions', async () => {
    const pending = deferred<{ suggestions: typeof suggestions }>();
    search.suggest.mockReturnValueOnce(pending.promise);
    const { input } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    await act(async () => pending.resolve({ suggestions }));

    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-busy', 'false');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('lets Escape cancel a pending debounce and arrow keys start searching again', async () => {
    const { input } = setup();
    typeQuery(input, 'Saint');
    fireEvent.keyDown(input, { key: 'Escape' });
    await finishDebounce();

    expect(search.suggest).not.toHaveBeenCalled();
    expect(input).toHaveValue('Saint');
    expect(input).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    await finishDebounce();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it.each(['pointer', 'focus'])('dismisses and cancels search when %s leaves the control', async (method) => {
    const pending = deferred<{ suggestions: typeof suggestions }>();
    search.suggest.mockReturnValueOnce(pending.promise);
    const { input } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();

    if (method === 'pointer') fireEvent.pointerDown(document.body);
    else act(() => input.blur());
    await act(async () => pending.resolve({ suggestions }));

    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('wraps keyboard selection, announces it, and opens a result only once', async () => {
    const pending = deferred<typeof locationResponse>();
    search.retrieve.mockReturnValueOnce(pending.promise);
    const { input, easeTo } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();
    const options = screen.getAllByRole('option');
    expect(input.getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
    expect(input).not.toHaveAttribute('aria-activedescendant');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveAttribute('aria-activedescendant', options[0].id);
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(search.retrieve).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Opening location');
    expect(input).not.toHaveAttribute('aria-activedescendant');
    await act(async () => pending.resolve(locationResponse));

    expect(easeTo).toHaveBeenCalledWith({ center: [-93.09, 44.95], zoom: 15, duration: 1000 });
    expect(input).toHaveValue('');
    expect(input).not.toHaveFocus();
    expect(input).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('preserves the query after a search failure and retries without retyping', async () => {
    search.suggest.mockRejectedValueOnce(new Error('Offline'));
    const { input } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();

    expect(input).toHaveValue('Saint');
    expect(screen.getByRole('alert')).toHaveTextContent('Check your connection');
    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByRole('option', { name: /Saint Paul/ });

    expect(search.suggest).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(input).toHaveFocus();
    await user.keyboard('{ArrowDown}{Enter}');
    expect(search.retrieve).toHaveBeenCalledOnce();
  });

  it('explains how to recover from an empty result', async () => {
    search.suggest.mockResolvedValueOnce({ suggestions: [] });
    const { input } = setup();
    typeQuery(input, 'Nowhere');
    await finishDebounce();

    expect(screen.getByText('No locations found')).toBeInTheDocument();
    expect(screen.getByText('Try a city, address, or postcode.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('distinguishes cities with the same name using their region and country', async () => {
    search.suggest.mockResolvedValueOnce({ suggestions: [
      { ...suggestions[0], full_address: undefined, place_formatted: 'Minnesota, United States' },
      { ...suggestions[0], mapbox_id: 'saint-paul-france', full_address: undefined, place_formatted: 'France' },
    ] });
    const { input } = setup();
    typeQuery(input, 'Saint Paul');
    await finishDebounce();

    expect(screen.getByRole('option', { name: 'Saint Paul, Minnesota, United States' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Saint Paul, France' })).toBeInTheDocument();
  });

  it.each(['network', 'empty', 'invalid'])('keeps results and retries after a %s location failure', async (failure) => {
    if (failure === 'network') search.retrieve.mockRejectedValueOnce(new Error('Offline'));
    else if (failure === 'empty') search.retrieve.mockResolvedValueOnce({ features: [] });
    else search.retrieve.mockResolvedValueOnce({ features: [{ properties: { coordinates: { longitude: NaN, latitude: 44.95 } } }] });
    const { input, easeTo } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();
    await act(async () => fireEvent.click(screen.getByRole('option', { name: /Saint Paul/ })));

    expect(input).toHaveValue('Saint');
    expect(easeTo).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t open that location');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(search.retrieve).toHaveBeenCalledTimes(2);
    expect(search.retrieve.mock.calls[1][0]).toEqual(suggestions[0]);
    expect(easeTo).toHaveBeenCalledOnce();
  });

  it('does not pan to a cancelled location after the user starts a new search', async () => {
    const pending = deferred<typeof locationResponse>();
    search.retrieve.mockReturnValueOnce(pending.promise);
    const { input, easeTo } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();
    fireEvent.click(screen.getByRole('option', { name: /Saint Paul/ }));
    typeQuery(input, 'Chicago');
    await act(async () => pending.resolve(locationResponse));

    expect(easeTo).not.toHaveBeenCalled();
    expect(input).toHaveValue('Chicago');
    expect(input).toHaveAttribute('aria-busy', 'true');
    await finishDebounce();
    expect(input).toHaveAttribute('aria-busy', 'false');
  });

  it('cancels requests on unmount', async () => {
    const pending = deferred<{ suggestions: typeof suggestions }>();
    search.suggest.mockReturnValueOnce(pending.promise);
    const { input, unmount } = setup();
    typeQuery(input, 'Saint');
    await finishDebounce();
    const signal = search.suggest.mock.calls[0][1].signal as AbortSignal;

    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve({ suggestions }));
  });
});
