import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'court-finder-favorites';

function getFavorites(): string[] {
  const startTs = Date.now();
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load saved facilities', {
      startTs,
      durationMs: Date.now() - startTs,
      storageKey: FAVORITES_KEY,
      error,
    });
    return [];
  }
}

function saveFavorites(favorites: string[]) {
  const startTs = Date.now();
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Failed to save facility favorite', {
      startTs,
      durationMs: Date.now() - startTs,
      storageKey: FAVORITES_KEY,
      favoriteCount: favorites.length,
      error,
    });
  }
}

interface FavoriteButtonProps {
  courtId: string;
  className?: string;
  showLabel?: boolean;
}

export function FavoriteButton({ courtId, className, showLabel = true }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Check if court is in favorites on mount
    const favorites = getFavorites();
    setIsFavorite(favorites.includes(courtId));
  }, [courtId]);

  const toggleFavorite = () => {
    const favorites = getFavorites();
    const newFavorites = isFavorite
      ? favorites.filter((id) => id !== courtId)
      : [...favorites, courtId];

    setIsFavorite(!isFavorite);
    saveFavorites(newFavorites);
  };

  return (
    <Button
      variant="outline"
      className={cn('min-h-12', !showLabel && 'min-w-12', className)}
      size="lg"
      onClick={toggleFavorite}
      type="button"
      aria-label={isFavorite ? 'Remove possible facility from saved places' : 'Save possible facility'}
      aria-pressed={isFavorite}
      title={isFavorite ? 'Remove from saved places' : 'Save this possible facility'}
    >
      <Heart
        className={cn(
          showLabel && 'mr-2',
          'h-4 w-4 transition-all',
          isFavorite && 'fill-current text-destructive'
        )}
        aria-hidden="true"
      />
      {showLabel && (isFavorite ? 'Saved' : 'Save')}
    </Button>
  );
}
