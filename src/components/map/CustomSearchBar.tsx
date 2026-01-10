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
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchBoxCore = useSearchBoxCore({ accessToken });
  // Create a session token for the search session
  const sessionToken = useMemo(() => crypto.randomUUID(), []);

  const commandRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  console.log('CustomSearchBar render:', { query, open, suggestionsCount: suggestions.length, isLoading });

  // Handle search input
  const handleSearch = useCallback(
    async (value: string) => {
      console.log('handleSearch called with:', value);
      setQuery(value);
      setSelectedIndex(0);

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
        console.log('Search response:', response);
        setSuggestions(response.suggestions);
        setOpen(true);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [searchBoxCore, sessionToken]
  );

  // Handle selection - retrieve coordinates and pan map
  const handleSelect = useCallback(
    async (suggestion: SearchBoxSuggestion) => {
      console.log('handleSelect called with:', suggestion);
      try {
        const response = await searchBoxCore.retrieve(suggestion, {
          sessionToken,
        });
        console.log('Retrieve response:', response);
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
      } catch (error) {
        console.error('Retrieve error:', error);
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
      <Command className="rounded-full border border-border bg-background/95 backdrop-blur-md shadow-md hover:shadow-lg transition-shadow">
        <div className="flex h-12 items-center px-4">
          <Search className="h-5 w-5 shrink-0 opacity-50 mr-3" />
          <Command.Input
            ref={inputRef}
            value={query}
            onValueChange={handleSearch}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              console.log('Input focused');
              setOpen(true);
            }}
            placeholder="Search locations..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-base outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {isLoading && (
            <Loader2 className="h-5 w-5 shrink-0 opacity-50 animate-spin ml-3" />
          )}
        </div>
      </Command>

      {/* Suggestions dropdown - using plain divs instead of cmdk components */}
      {(open || isLoading) && (
        <div
          className="absolute top-full left-0 right-0 mt-2 z-[9999] bg-popover text-popover-foreground rounded-md shadow-lg overflow-hidden no-zoom"
        >
          {isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          )}
          {!isLoading && suggestions.length === 0 && query.length >= 2 && (
            <div className="py-6 text-center text-base text-muted-foreground">
              No locations found
            </div>
          )}
          {!isLoading && suggestions.length > 0 && (
            <>
              <div className="px-4 py-2.5 text-sm font-medium text-muted-foreground">
                Suggestions
              </div>
              <div
                ref={listRef}
                className="max-h-[300px] overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion.mapbox_id}
                    onClick={() => handleSelect(suggestion)}
                    className={cn(
                      'relative flex cursor-pointer items-center gap-3 px-4 py-3 text-base outline-hidden select-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      index === selectedIndex && 'bg-accent text-accent-foreground'
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
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
