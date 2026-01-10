import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface FavoriteButtonProps {
  courtId: string;
  className?: string;
}

const FAVORITES_KEY = 'court-finder-favorites';

export function FavoriteButton({ courtId, className }: FavoriteButtonProps) {
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

  const getFavorites = (): string[] => {
    try {
      const stored = localStorage.getItem(FAVORITES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveFavorites = (favorites: string[]) => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  };

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
      className={cn('w-full', className)}
      size="lg"
      onClick={toggleFavorite}
    >
      <Heart
        className={cn(
          'mr-2 h-4 w-4 transition-all',
          isFavorite && 'fill-current text-red-500'
        )}
      />
      {isFavorite ? 'Saved to Favorites' : 'Save to Favorites'}
    </Button>
  );
}
