import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CourtImageData } from '@/lib/types';

const TILE_SIZE = 1024; // 512@2x
const EDGE_THRESHOLD = 100; // Pixels from edge to trigger adjacent tile fetch
const CROP_PADDING = 2.5; // Multiplier for padding around court bbox

interface CourtSatelliteImageProps {
  courtData: CourtImageData | null;
  className?: string;
}

interface BboxStyle {
  left: string;
  top: string;
  width: string;
  height: string;
}

/**
 * Determines which adjacent tiles need to be fetched based on court position
 */
function getRequiredTiles(courtData: CourtImageData): Array<{
  z: number;
  x: number;
  y: number;
  url: string;
  offsetX: number;
  offsetY: number;
}> {
  const { tileZ, tileX, tileY, pixelX, pixelY } = courtData;
  const maxTile = Math.pow(2, tileZ) - 1;

  const tiles: Array<{
    z: number;
    x: number;
    y: number;
    url: string;
    offsetX: number;
    offsetY: number;
  }> = [];

  // Determine which adjacent tiles are needed
  const needNorth = pixelY < EDGE_THRESHOLD && tileY > 0;
  const needSouth = pixelY > TILE_SIZE - EDGE_THRESHOLD && tileY < maxTile;
  const needWest = pixelX < EDGE_THRESHOLD && tileX > 0;
  const needEast = pixelX > TILE_SIZE - EDGE_THRESHOLD && tileX < maxTile;

  // Determine grid size and offsets
  const cols = needWest && needEast ? 3 : needWest || needEast ? 2 : 1;
  const rows = needNorth && needSouth ? 3 : needNorth || needSouth ? 2 : 1;

  // Base URL pattern - we'll construct URLs for each tile
  const baseUrl = courtData.tileUrl.replace(/\/\d+\/\d+\/\d+@2x/, '');

  // Generate tile URLs for all positions in the grid
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      let x = tileX;
      let y = tileY;

      // Adjust y for row
      if (needNorth) {
        y = tileY - 1 + row;
      } else if (needSouth) {
        y = tileY + row;
      }

      // Adjust x for col
      if (needWest) {
        x = tileX - 1 + col;
      } else if (needEast) {
        x = tileX + col;
      }

      // Skip invalid tiles
      if (x < 0 || x > maxTile || y < 0 || y > maxTile) continue;

      // Construct URL using the same pattern as styleTileUrl
      const url = `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/${tileZ}/${x}/${y}@2x?${courtData.tileUrl.split('?')[1]}`;

      tiles.push({
        z: tileZ,
        x,
        y,
        url,
        offsetX: col * TILE_SIZE,
        offsetY: row * TILE_SIZE,
      });
    }
  }

  return tiles;
}

/**
 * Stitches multiple tile images together on a canvas
 */
async function stitchTiles(tiles: Array<{ url: string; offsetX: number; offsetY: number }>): Promise<HTMLCanvasElement> {
  const maxX = Math.max(...tiles.map(t => t.offsetX));
  const maxY = Math.max(...tiles.map(t => t.offsetY));
  const canvas = document.createElement('canvas');
  canvas.width = maxX + TILE_SIZE;
  canvas.height = maxY + TILE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Load all images
  const loadPromises = tiles.map(async (tile) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    return new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = tile.url;
    }).then(img => ({ img, ...tile }));
  });

  const loadedImages = await Promise.all(loadPromises);

  // Draw each image at its offset
  for (const { img, offsetX, offsetY } of loadedImages) {
    ctx.drawImage(img, offsetX, offsetY, TILE_SIZE, TILE_SIZE);
  }

  return canvas;
}

interface CropResult {
  dataUrl: string;
  bboxStyle: BboxStyle;
}

/**
 * Calculates the crop area and bbox position for the final image
 */
function calculateCropBounds(
  courtData: CourtImageData,
  tiles: Array<{ offsetX: number; offsetY: number; x: number; y: number }>
): { cropX: number; cropY: number; cropWidth: number; cropHeight: number; bboxInCrop: BboxStyle } {
  const { pixelX, pixelY, pixelWidth, pixelHeight, tileX, tileY } = courtData;

  // Find the court tile in the tiles array - it's the tile with matching x, y coordinates
  const courtTile = tiles.find(t => t.x === tileX && t.y === tileY);
  if (!courtTile) {
    // Fallback: assume court is at origin if tile not found
    throw new Error('Court tile not found in tiles array');
  }

  // Court center in the stitched canvas coordinates
  const courtCenterX = pixelX + courtTile.offsetX;
  const courtCenterY = pixelY + courtTile.offsetY;

  // Calculate desired crop size based on court dimensions with padding
  const desiredCropWidth = pixelWidth * CROP_PADDING;
  const desiredCropHeight = pixelHeight * CROP_PADDING;

  // Ensure minimum size for visibility
  const minWidth = Math.max(desiredCropWidth, 400);
  const minHeight = Math.max(desiredCropHeight, 400);

  // Use the court's aspect ratio for the crop
  const cropWidth = minWidth;
  const cropHeight = minHeight;

  // Calculate crop bounds centered on court
  let cropX = courtCenterX - cropWidth / 2;
  let cropY = courtCenterY - cropHeight / 2;

  // Determine canvas size from tiles
  const maxX = Math.max(...tiles.map(t => t.offsetX));
  const maxY = Math.max(...tiles.map(t => t.offsetY));
  const canvasWidth = maxX + TILE_SIZE;
  const canvasHeight = maxY + TILE_SIZE;

  // Clamp to canvas bounds
  cropX = Math.max(0, Math.min(cropX, canvasWidth - cropWidth));
  cropY = Math.max(0, Math.min(cropY, canvasHeight - cropHeight));

  // Recalculate size if we're at an edge
  const availableWidth = canvasWidth - cropX;
  const availableHeight = canvasHeight - cropY;
  const finalCropWidth = Math.min(cropWidth, availableWidth);
  const finalCropHeight = Math.min(cropHeight, availableHeight);

  // Calculate where the court bbox is in the final cropped image
  // Court bbox top-left in stitched canvas (pixelX/Y are center points from Roboflow)
  const courtBboxX = pixelX + courtTile.offsetX - pixelWidth / 2;
  const courtBboxY = pixelY + courtTile.offsetY - pixelHeight / 2;

  // Position in cropped image
  const bboxInCropX = courtBboxX - cropX;
  const bboxInCropY = courtBboxY - cropY;

  // Convert to percentage for CSS
  const bboxStyle: BboxStyle = {
    left: `${(bboxInCropX / finalCropWidth) * 100}%`,
    top: `${(bboxInCropY / finalCropHeight) * 100}%`,
    width: `${(pixelWidth / finalCropWidth) * 100}%`,
    height: `${(pixelHeight / finalCropHeight) * 100}%`,
  };

  return {
    cropX: Math.round(cropX),
    cropY: Math.round(cropY),
    cropWidth: Math.round(finalCropWidth),
    cropHeight: Math.round(finalCropHeight),
    bboxInCrop: bboxStyle,
  };
}

export function CourtSatelliteImage({ courtData, className }: CourtSatelliteImageProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [bboxStyle, setBboxStyle] = useState<BboxStyle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (!courtData || processingRef.current) return;

    processingRef.current = true;
    setIsLoading(true);
    setError(null);
    setImageDataUrl(null);
    setBboxStyle(null);

    const processImage = async () => {
      try {
        // Get required tiles (including adjacent if needed)
        const tiles = getRequiredTiles(courtData);

        // Stitch tiles together
        const canvas = await stitchTiles(tiles);

        // Calculate crop bounds and bbox position using actual tile positions
        const { cropX, cropY, cropWidth, cropHeight, bboxInCrop } =
          calculateCropBounds(courtData, tiles);

        // Create cropped canvas
        const croppedCanvas = document.createElement('canvas');
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        const croppedCtx = croppedCanvas.getContext('2d');
        if (!croppedCtx) throw new Error('Failed to get cropped canvas context');

        croppedCtx.drawImage(
          canvas,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );

        // Convert to data URL
        const dataUrl = croppedCanvas.toDataURL('image/jpeg', 0.9);
        setImageDataUrl(dataUrl);
        setBboxStyle(bboxInCrop);
      } catch (err) {
        console.error('Error processing court satellite image:', err);
        setError(err instanceof Error ? err.message : 'Failed to load image');
      } finally {
        setIsLoading(false);
        processingRef.current = false;
      }
    };

    processImage();
  }, [courtData]);

  // Reset when court data changes to null
  useEffect(() => {
    if (!courtData) {
      setImageDataUrl(null);
      setBboxStyle(null);
      setIsLoading(true);
      setError(null);
      processingRef.current = false;
    }
  }, [courtData]);

  if (!courtData) return null;

  return (
    <div className={cn('relative w-full aspect-square bg-muted rounded-lg overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/80">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan" />
              </div>
            </div>
            <span className="text-sm text-muted-foreground animate-pulse">
              Loading satellite image...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/90">
          <div className="text-center text-sm text-muted-foreground">
            <p>Unable to load satellite image</p>
          </div>
        </div>
      )}

      {imageDataUrl && (
        <img
          src={imageDataUrl}
          alt="Satellite view of court"
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* Court bbox overlay */}
      {imageDataUrl && bboxStyle && (
        <div
          className="absolute border-2 border-primary/70 rounded-sm shadow-lg pointer-events-none box-border"
          style={bboxStyle}
        />
      )}
    </div>
  );
}
