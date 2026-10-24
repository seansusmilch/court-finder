import { useState, useCallback, useRef, useEffect, useId } from 'react';
import type { KeyboardEvent, MutableRefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { useSearchBoxCore } from '@mapbox/search-js-react';
import type { SearchBoxSuggestion } from '@mapbox/search-js-core';
import { Search, Loader2, MapPin, Building2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomSearchBarProps {
  accessToken: string;
  mapRef: MutableRefObject<MapRef | null>;
  className?: string;
}

const SEARCH_DELAY_MS = 300;

export function CustomSearchBar({ accessToken, mapRef, className }: CustomSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchBoxSuggestion[]>([]);
  const [loading, setLoading] = useState<'suggest' | 'retrieve' | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [failedSelection, setFailedSelection] = useState<SearchBoxSuggestion | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const searchBoxCore = useSearchBoxCore({ accessToken });
  const sessionToken = useRef(crypto.randomUUID());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRequest = useRef<AbortController | null>(null);
  const listId = useId();
  const hasOptions = open && !loading && suggestions.length > 0;

  const cancelPending = useCallback(() => {
    if (searchTimer.current !== null) {
      clearTimeout(searchTimer.current);
      searchTimer.current = null;
    }
    pendingRequest.current?.abort();
    pendingRequest.current = null;
  }, []);

  const dismiss = useCallback(() => {
    cancelPending();
    setOpen(false);
    setLoading(null);
  }, [cancelPending]);

  const handleSearch = useCallback((value: string) => {
    cancelPending();
    setQuery(value);
    setSelectedIndex(-1);
    setSearchError(null);
    setFailedSelection(null);
    setSuggestions([]);

    const searchText = value.trim();
    if (searchText.length < 2) {
      setLoading(null);
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading('suggest');
    const controller = new AbortController();
    pendingRequest.current = controller;
    searchTimer.current = setTimeout(async () => {
      searchTimer.current = null;
      try {
        const response = await searchBoxCore.suggest(searchText, {
          sessionToken: sessionToken.current,
          limit: 8,
          signal: controller.signal,
        });
        // Also guard against clients that finish a request after cancellation.
        if (!controller.signal.aborted) setSuggestions(response.suggestions);
      } catch {
        if (!controller.signal.aborted) {
          setSearchError('Search is unavailable right now. Check your connection and try again.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(null);
      }
    }, SEARCH_DELAY_MS);
  }, [cancelPending, searchBoxCore]);

  const handleSelect = useCallback(async (suggestion: SearchBoxSuggestion) => {
    cancelPending();
    const controller = new AbortController();
    pendingRequest.current = controller;
    setLoading('retrieve');
    setSearchError(null);
    setFailedSelection(null);

    try {
      const response = await searchBoxCore.retrieve(suggestion, {
        sessionToken: sessionToken.current,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      const coordinates = response.features[0]?.properties.coordinates;
      if (
        !coordinates ||
        !Number.isFinite(coordinates.longitude) ||
        !Number.isFinite(coordinates.latitude) ||
        !mapRef.current
      ) {
        throw new Error('Location coordinates or map are unavailable');
      }

      mapRef.current.easeTo({
        center: [coordinates.longitude, coordinates.latitude],
        zoom: 15,
        duration: 1000,
      });
      sessionToken.current = crypto.randomUUID();
      setQuery('');
      setSuggestions([]);
      setOpen(false);
      inputRef.current?.blur();
    } catch {
      if (!controller.signal.aborted) {
        setSearchError('We couldn’t open that location. Try again or choose another result.');
        setFailedSelection(suggestion);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(null);
    }
  }, [cancelPending, searchBoxCore, mapRef]);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }

    if (!hasOptions) {
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && !open && query.trim().length >= 2) {
        event.preventDefault();
        handleSearch(query);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex((index) => (index + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex((index) => (index <= 0 ? suggestions.length : index) - 1);
        break;
      case 'Enter':
        event.preventDefault();
        void handleSelect(suggestions[Math.max(selectedIndex, 0)]);
        break;
    }
  };

  useEffect(() => {
    if (hasOptions && selectedIndex >= 0) {
      const selectedElement = listRef.current?.children[selectedIndex] as HTMLElement | undefined;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [hasOptions, selectedIndex]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) dismiss();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      cancelPending();
    };
  }, [cancelPending, dismiss]);

  const status = !open || searchError
    ? ''
    : loading === 'retrieve'
      ? 'Opening location…'
      : loading === 'suggest'
        ? 'Searching locations…'
        : suggestions.length === 0
          ? 'No locations found. Try a city, address, or postcode.'
          : `${suggestions.length} location suggestions available. Use the up and down arrow keys to choose a result.`;

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) dismiss();
      }}
    >
      <div className='rounded-xl border border-border/80 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow] focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/30'>
        <div className='flex min-h-[52px] items-center pl-4 pr-1'>
          <Search className='mr-3 size-5 shrink-0 text-secondary' aria-hidden='true' />
          <input
            ref={inputRef}
            type='text'
            role='combobox'
            value={query}
            onChange={(event) => handleSearch(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!open && query.trim().length >= 2) handleSearch(query);
            }}
            aria-label='Search locations'
            aria-controls={open ? listId : undefined}
            aria-expanded={open}
            aria-activedescendant={hasOptions && selectedIndex >= 0 ? `${listId}-${selectedIndex}` : undefined}
            aria-autocomplete='list'
            aria-busy={!!loading}
            autoComplete='off'
            autoCapitalize='none'
            spellCheck={false}
            enterKeyHint='search'
            placeholder='Search locations'
            className='h-12 min-w-0 flex-1 rounded-md bg-transparent py-3 text-base outline-hidden placeholder:text-muted-foreground'
          />
          {loading && (
            <Loader2 className='mx-2 size-5 shrink-0 motion-safe:animate-spin text-secondary' aria-hidden='true' />
          )}
          {query && (
            <button
              type='button'
              aria-label='Clear search'
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                inputRef.current?.focus();
                handleSearch('');
              }}
              className='flex size-12 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary'
            >
              <X className='size-5' aria-hidden='true' />
            </button>
          )}
        </div>
      </div>

      <p className='sr-only' role='status'>{status}</p>

      {open && (
        <div className='absolute inset-x-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-[0_4px_16px_rgba(0,0,0,0.16)] no-zoom'>
          <div className='max-h-[min(24rem,50dvh)] overflow-y-auto overscroll-contain'>
            {loading && (
              <p className='px-4 py-6 text-center text-sm text-muted-foreground'>
                {loading === 'retrieve' ? 'Opening location…' : 'Searching locations…'}
              </p>
            )}
            {!loading && searchError && (
              <div className='px-4 pb-2 pt-4'>
                <p className='text-sm text-destructive' role='alert'>{searchError}</p>
                <button
                  type='button'
                  onClick={() => {
                    inputRef.current?.focus();
                    if (failedSelection) void handleSelect(failedSelection);
                    else handleSearch(query);
                  }}
                  className='mt-2 min-h-12 rounded-lg px-3 text-sm font-medium underline underline-offset-4 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary'
                >
                  Try again
                </button>
              </div>
            )}
            {!loading && !searchError && suggestions.length === 0 && (
              <div className='px-4 py-6 text-sm'>
                <p className='font-medium'>No locations found</p>
                <p className='mt-1 text-muted-foreground'>Try a city, address, or postcode.</p>
              </div>
            )}
            {hasOptions && (
              <div className='px-4 pb-2 pt-3 text-sm font-medium text-muted-foreground'>Search suggestions</div>
            )}
            <div ref={listRef} id={listId} role='listbox' aria-label='Location suggestions' className={cn(hasOptions && 'px-1 pb-1')}>
              {hasOptions && suggestions.map((suggestion, index) => {
                const Icon = suggestion.feature_type === 'poi' || suggestion.feature_type === 'category' ? Building2 : MapPin;
                const address = suggestion.full_address || suggestion.place_formatted;
                return (
                  <button
                    type='button'
                    key={suggestion.mapbox_id}
                    id={`${listId}-${index}`}
                    tabIndex={-1}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleSelect(suggestion)}
                    role='option'
                    aria-label={address ? `${suggestion.name}, ${address}` : suggestion.name}
                    aria-selected={index === selectedIndex}
                    className={cn(
                      'relative flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-base outline-hidden select-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary',
                      index === selectedIndex && 'bg-secondary/10 text-foreground'
                    )}
                  >
                    <Icon className='size-5 shrink-0 text-muted-foreground' aria-hidden='true' />
                    <span className='flex min-w-0 flex-col gap-0.5'>
                      <span className='truncate font-medium'>{suggestion.name}</span>
                      {address && <span className='truncate text-sm text-muted-foreground'>{address}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
