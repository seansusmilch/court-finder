import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

const FAVORITES_KEY = 'court-finder-favorites';

function getFavorites(): string[] {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites: string[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (error) {
    console.error('Error saving favorites:', error);
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
    try {
      const favorites = getFavorites();
      setIsFavorite(favorites.includes(courtId));
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
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
      className={className}
      size="lg"
      onClick={toggleFavorite}
    >
      <Heart
        className={cn(
          showLabel && 'mr-2',
          'h-4 w-4 transition-all',
          isFavorite && 'fill-current text-red-500'
        )}
      />
      {showLabel && (isFavorite ? 'Saved' : 'Save')}
    </Button>
  );
}
