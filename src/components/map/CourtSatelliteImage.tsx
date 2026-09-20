import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CourtImageData } from '@/lib/types';
import { CircleAlert } from 'lucide-react';

const TILE_SIZE = 1024; // 512@2x
const EDGE_THRESHOLD = 100; // Pixels from edge to trigger adjacent tile fetch
const CROP_PADDING = 2.5; // Multiplier for padding around court bbox

interface CourtSatelliteImageProps {
  courtData: CourtImageData | null;
  className?: string;
  loading?: boolean;
  alt?: string;
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

export function CourtSatelliteImage({
  courtData,
  className,
  loading = false,
  alt = 'Satellite evidence for a possible facility',
}: CourtSatelliteImageProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [bboxStyle, setBboxStyle] = useState<BboxStyle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!courtData) {
      setImageDataUrl(null);
      setBboxStyle(null);
      setIsLoading(loading);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setImageDataUrl(null);
    setBboxStyle(null);

    const processImage = async () => {
      const startTs = Date.now();
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
        if (requestId === requestIdRef.current) {
          setImageDataUrl(dataUrl);
          setBboxStyle(bboxInCrop);
        }
      } catch (err) {
        console.error('Failed to prepare court satellite evidence', {
          startTs,
          durationMs: Date.now() - startTs,
          tile: {
            z: courtData.tileZ,
            x: courtData.tileX,
            y: courtData.tileY,
          },
          error: err,
        });
        if (requestId === requestIdRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to load image');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    processImage();
  }, [courtData, loading]);

  if (!courtData) {
    return (
      <div
        className={cn(
          'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted px-6 text-center',
          className
        )}
        role={loading ? 'status' : 'img'}
        aria-live={loading ? 'polite' : undefined}
        aria-label={loading ? undefined : alt}
      >
        <div className="flex max-w-xs flex-col items-center gap-3 text-sm text-muted-foreground">
          {loading ? (
            <>
              <Skeleton className="h-16 w-16 rounded-lg" aria-hidden="true" />
              <span>Loading satellite evidence…</span>
            </>
          ) : (
            <>
              <CircleAlert className="h-6 w-6 text-warning" aria-hidden="true" />
              <span className="font-medium text-foreground">Satellite evidence unavailable</span>
              <span>This detection can still be reviewed using its model and location details.</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full aspect-square bg-muted rounded-lg overflow-hidden', className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/90" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Skeleton className="w-20 h-20 rounded-lg" />
              <div className="absolute inset-0 overflow-hidden rounded-lg">
                <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary/60 animate-pulse" />
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Preparing satellite evidence…</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/95 px-6" role="alert">
          <div className="flex max-w-xs flex-col items-center gap-2 text-center text-sm text-muted-foreground">
            <CircleAlert className="h-6 w-6 text-destructive" aria-hidden="true" />
            <p className="font-medium text-foreground">Satellite evidence could not be prepared</p>
            <p>Details below remain available for review.</p>
          </div>
        </div>
      )}

      {imageDataUrl && (
        <img
          src={imageDataUrl}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoading ? 'opacity-0' : 'opacity-100'
          )}
        />
      )}

      {/* Court bbox overlay */}
      {imageDataUrl && bboxStyle && (
        <div
          className="pointer-events-none absolute box-border rounded-sm border-2 border-secondary/80 shadow-lg"
          style={bboxStyle}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
