import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { useSearchBoxCore } from '@mapbox/search-js-react';
import type { SearchBoxSuggestion } from '@mapbox/search-js-core';
import { Command } from 'cmdk';
import { Search, Loader2, MapPin, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomSearchBarProps {
  accessToken: string;
  mapRef: React.MutableRefObject<MapRef | null>;
  className?: string;
}

export function CustomSearchBar({
  accessToken,
  mapRef,
  className,
}: CustomSearchBarProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchBoxSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchBoxCore = useSearchBoxCore({ accessToken });
  // Create a session token for the search session
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const commandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Handle search input
  const handleSearch = useCallback(
    async (value: string) => {
      setQuery(value);
      setSelectedIndex(0);
      setSearchError(null);

      if (value.length < 2) {
        setSuggestions([]);
        setOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await searchBoxCore.suggest(value, {
          sessionToken,
          limit: 8,
        });
        setSuggestions(response.suggestions);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setSearchError('Search is unavailable right now. Try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [searchBoxCore, sessionToken]
  );

  // Handle selection - retrieve coordinates and pan map
  const handleSelect = useCallback(
    async (suggestion: SearchBoxSuggestion) => {
      try {
        const response = await searchBoxCore.retrieve(suggestion, {
          sessionToken,
        });
        const feature = response.features[0];
        const coordinates = feature.properties.coordinates;

        if (coordinates && mapRef.current) {
          mapRef.current.easeTo({
            center: [coordinates.longitude, coordinates.latitude],
            zoom: 15,
            duration: 1000,
          });
        }

        // Reset state
        setQuery('');
        setSuggestions([]);
        setOpen(false);
      } catch {
        setSearchError('We couldn’t open that location. Try another result.');
      }
    },
    [searchBoxCore, sessionToken, mapRef]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || suggestions.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, suggestions.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (suggestions[selectedIndex]) {
            handleSelect(suggestions[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, suggestions, selectedIndex, handleSelect]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && selectedIndex > 0) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (commandRef.current && !commandRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for suggestion type
  const getSuggestionIcon = (suggestion: SearchBoxSuggestion) => {
    if (suggestion.feature_type === 'poi' || suggestion.feature_type === 'category') {
      return <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />;
    }
    return <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />;
  };

  return (
    <div ref={commandRef} className={cn('relative w-full', className)}>
      <Command className="rounded-xl border border-border/80 bg-card shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow] focus-within:border-secondary focus-within:ring-2 focus-within:ring-secondary/30">
        <div className="flex min-h-[52px] items-center px-4">
          <Search className="mr-3 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={handleSearch}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
            aria-label="Search locations"
            aria-controls="map-search-suggestions"
            aria-expanded={open && suggestions.length > 0}
            aria-activedescendant={
              open && suggestions.length > 0
                ? `map-search-suggestion-${selectedIndex}`
                : undefined
            }
            aria-autocomplete="list"
            aria-busy={isLoading}
            placeholder="Search locations"
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-base outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isLoading && (
            <Loader2
              className="ml-3 h-5 w-5 shrink-0 animate-spin text-secondary"
              aria-hidden="true"
            />
          )}
        </div>
      </Command>

      {/* Suggestions dropdown - using plain divs instead of cmdk components */}
      {(open || isLoading) && (
        <div
          className="absolute left-0 right-0 top-full z-[9999] mt-2 overflow-hidden rounded-xl border border-border/80 bg-popover text-popover-foreground shadow-[0_4px_16px_rgba(0,0,0,0.16)] no-zoom"
        >
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground" role="status">
              Searching...
            </div>
          )}
          {!isLoading && searchError && (
            <div className="px-4 py-4 text-sm text-destructive" role="alert">
              {searchError}
            </div>
          )}
          {!isLoading && !searchError && suggestions.length === 0 && query.length >= 2 && (
            <div className="py-6 text-center text-base text-muted-foreground">
              No locations found
            </div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <>
              <div className="px-4 pb-2 pt-3 text-sm font-medium text-muted-foreground">
                Search suggestions
              </div>
              <div
                id="map-search-suggestions"
                ref={listRef}
                role="listbox"
                aria-label="Location suggestions"
                className="max-h-[300px] overflow-y-auto px-1 pb-1"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    type="button"
                    key={suggestion.mapbox_id}
                    id={`map-search-suggestion-${index}`}
                    onClick={() => handleSelect(suggestion)}
                    role="option"
                    aria-selected={index === selectedIndex}
                    className={cn(
                      'relative flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-base outline-hidden select-none transition-colors',
                      'hover:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-secondary',
                      index === selectedIndex && 'bg-secondary/10 text-foreground'
                    )}
                  >
                    {getSuggestionIcon(suggestion)}
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <span className="font-medium text-base truncate">
                        {suggestion.name}
                      </span>
                      {suggestion.full_address && (
                        <span className="text-sm text-muted-foreground truncate">
                          {suggestion.full_address}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
