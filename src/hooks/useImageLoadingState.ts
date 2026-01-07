import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook to manage image loading state during prediction transitions.
 * Prevents UI flashing by maintaining cached data visibility.
 */
export function useImageLoadingState(
  isTransitioning: boolean,
  currentImageUrl: string | undefined
) {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const previousImageUrlRef = useRef<string | undefined>(undefined);

  // When transitioning and showing cached data, the image is already loaded
  useEffect(() => {
    if (isTransitioning) {
      setIsImageLoading(false);
    }
  }, [isTransitioning]);

  // When new data arrives and we're no longer transitioning, track the URL change
  useEffect(() => {
    if (!isTransitioning && currentImageUrl) {
      if (currentImageUrl !== previousImageUrlRef.current) {
        previousImageUrlRef.current = currentImageUrl;
        setIsImageLoading(true); // Expect ImageViewer to manage this via onLoadingChange
      }
    }
  }, [isTransitioning, currentImageUrl]);

  const handleImageLoadingChange = useCallback((loading: boolean) => {
    setIsImageLoading(loading);
  }, []);

  // If we're using cached data (transitioning), allow interaction
  // Otherwise, disable buttons only if image is actually loading
  const isActuallyLoading = isTransitioning ? false : isImageLoading;

  return {
    isImageLoading,
    isActuallyLoading,
    handleImageLoadingChange,
  };
}
