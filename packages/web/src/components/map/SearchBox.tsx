import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

type GeocodingFeature = {
  id: string;
  place_name: string;
  center: [number, number];
};

interface SearchBoxProps {
  apiKey: string | undefined;
  onSelect: (lng: number, lat: number) => void;
}

export function SearchBox({ apiKey, onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!apiKey) return;

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    if (!query || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setHighlightIndex(-1);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${apiKey}&autocomplete=true&limit=5&types=place,locality,neighborhood,address,poi`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);
        const data = await res.json();
        const feats: GeocodingFeature[] = (data.features || []).map(
          (f: any) => ({
            id: String(f.id),
            place_name: String(f.place_name),
            center: [Number(f.center?.[0]), Number(f.center?.[1])],
          })
        );
        setResults(feats);
        setOpen(true);
        setHighlightIndex(-1);
      } catch (err: any) {
        setError(err?.message || 'Search failed');
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, apiKey]);

  const handleSelect = (feature: GeocodingFeature) => {
    setOpen(false);
    setQuery(feature.place_name);
    onSelect(feature.center[0], feature.center[1]);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = highlightIndex >= 0 ? highlightIndex : 0;
      handleSelect(results[idx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className='w-72'>
      <Card className='py-2 px-3 shadow-sm'>
        <CardContent className='p-0'>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Search location...'
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
          />
        </CardContent>
      </Card>
      {open && (
        <Card className='mt-1 shadow-sm max-h-72 overflow-auto z-[60]'>
          <CardContent className='p-0'>
            {loading && (
              <div className='px-3 py-2 text-sm text-muted-foreground'>
                Searching…
              </div>
            )}
            {error && !loading && (
              <div className='px-3 py-2 text-sm text-destructive'>{error}</div>
            )}
            {!loading && !error && results.length === 0 && (
              <div className='px-3 py-2 text-sm text-muted-foreground'>
                No results
              </div>
            )}
            {!loading && !error && results.length > 0 && (
              <ul>
                {results.map((r, idx) => (
                  <li
                    key={r.id}
                    className={
                      'px-3 py-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground ' +
                      (idx === highlightIndex ? 'bg-accent' : '')
                    }
                    onMouseEnter={() => setHighlightIndex(idx)}
                    onMouseLeave={() => setHighlightIndex(-1)}
                    onClick={() => handleSelect(r)}
                    title={r.place_name}
                  >
                    {r.place_name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
