import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { AlertTriangle, ScanSearch } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type Transform = {
  scale: number;
  x: number;
  y: number;
};

const MAX_SCALE = 12;
const MIN_SCALE = 0.05;

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export default function ImageViewer({
  imageUrl,
  imageWidth,
  imageHeight,
  bbox,
  className,
  onLoadingChange,
}: {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  bbox: BoundingBox;
  className?: string;
  onLoadingChange?: (isLoading: boolean) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  const [viewport, setViewport] = useState<ViewportSize>({
    width: 0,
    height: 0,
  });
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [pinchState, setPinchState] = useState<{ lastDistance: number } | null>(
    null
  );
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const fitToDetection = useCallback(() => {
    if (!viewport.width || !viewport.height) return;

    const detectionWidth = Math.max(bbox.width, 1);
    const detectionHeight = Math.max(bbox.height, 1);
    const scale = Math.min(
      viewport.width / (detectionWidth * 3),
      viewport.height / (detectionHeight * 3)
    );

    setTransform({
      scale: clampScale(scale),
      x: viewport.width / 2 - bbox.x * scale,
      y: viewport.height / 2 - bbox.y * scale,
    });
  }, [bbox.height, bbox.width, bbox.x, bbox.y, viewport.height, viewport.width]);

  const zoomAtPoint = useCallback(
    (factor: number, point: { x: number; y: number }) => {
      setTransform((previous) => {
        const nextScale = clampScale(previous.scale * factor);
        const scaleRatio = nextScale / previous.scale;

        return {
          scale: nextScale,
          x: point.x - (point.x - previous.x) * scaleRatio,
          y: point.y - (point.y - previous.y) * scaleRatio,
        };
      });
    },
    []
  );

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateViewport = () => {
      setViewport({
        width: node.clientWidth,
        height: node.clientHeight,
      });
    };

    updateViewport();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateViewport);
      return () => window.removeEventListener('resize', updateViewport);
    }

    const observer = new ResizeObserver(updateViewport);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fitToDetection();
  }, [fitToDetection, imageUrl, imageHeight, imageWidth]);

  useEffect(() => {
    setIsImageLoading(true);
    setImageError(false);
    onLoadingChange?.(true);

    const checkIfLoaded = () => {
      if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
        setIsImageLoading(false);
        onLoadingChange?.(false);
      }
    };

    checkIfLoaded();
    const timeoutId = setTimeout(checkIfLoaded, 50);
    return () => clearTimeout(timeoutId);
  }, [imageUrl, onLoadingChange]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      zoomAtPoint(event.deltaY < 0 ? 1.1 : 1 / 1.1, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };

    node.addEventListener('wheel', onWheel, { passive: false });
    return () => node.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    pointersRef.current.set(event.pointerId, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    node.setPointerCapture(event.pointerId);

    if (pointersRef.current.size === 1) {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - transform.x,
        y: event.clientY - transform.y,
      });
    } else if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values());
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
      );
      setPinchState({ lastDistance: distance });
      setIsDragging(false);
    }
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }

    if (pointersRef.current.size === 2 && pinchState) {
      const points = Array.from(pointersRef.current.values());
      const midpoint = {
        x: (points[0].x + points[1].x) / 2,
        y: (points[0].y + points[1].y) / 2,
      };
      const distance = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y
      );
      const scaleFactor = distance / pinchState.lastDistance;

      zoomAtPoint(scaleFactor, midpoint);
      setPinchState({ lastDistance: distance });
      return;
    }

    if (isDragging && pointersRef.current.size === 1) {
      event.preventDefault();
      setTransform((previous) => ({
        ...previous,
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y,
      }));
    }
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (containerRef.current?.hasPointerCapture(event.pointerId)) {
      containerRef.current.releasePointerCapture(event.pointerId);
    }
    if (pointersRef.current.size < 2) setPinchState(null);
    if (pointersRef.current.size === 0) setIsDragging(false);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomAtPoint(1.2, {
        x: viewport.width / 2,
        y: viewport.height / 2,
      });
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomAtPoint(1 / 1.2, {
        x: viewport.width / 2,
        y: viewport.height / 2,
      });
    } else if (event.key === '0') {
      event.preventDefault();
      fitToDetection();
    }
  };

  const handleImageLoad = () => {
    setIsImageLoading(false);
    setImageError(false);
    onLoadingChange?.(false);
  };

  const handleImageError = () => {
    setIsImageLoading(false);
    setImageError(true);
    onLoadingChange?.(false);
  };

  const isOverlayVisible = isImageLoading || imageError;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative isolate mx-auto aspect-[4/3] w-full max-h-[50vh] touch-none select-none overflow-hidden rounded-xl border border-border/70 bg-muted/30 shadow-sm outline-none focus-visible:ring-[3px] focus-visible:ring-secondary/60 focus-visible:ring-offset-2',
        className
      )}
      role='region'
      aria-label='Interactive satellite image. Drag to pan, use the wheel or pinch to zoom.'
      tabIndex={0}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      <div className='pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 p-3 sm:p-4'>
        <span className='inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground shadow-sm'>
          <ScanSearch aria-hidden='true' className='size-3.5 text-primary' />
          Satellite view
        </span>
        <span className='hidden rounded-full border border-border/70 bg-background/85 px-2.5 py-1.5 text-xs font-medium text-muted-foreground shadow-sm sm:inline-flex'>
          Drag to explore
        </span>
      </div>

      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-background/90 transition-opacity duration-200',
          isOverlayVisible ? 'opacity-100' : 'opacity-0'
        )}
        aria-live='polite'
      >
        {imageError ? (
          <div className='flex max-w-xs flex-col items-center gap-3 px-6 text-center'>
            <AlertTriangle aria-hidden='true' className='size-8 text-destructive' />
            <div>
              <p className='text-sm font-semibold'>Satellite image unavailable</p>
              <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                Try this review again later.
              </p>
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center gap-4'>
            <div className='relative flex size-20 items-center justify-center rounded-xl border border-border/70 bg-muted'>
              <Skeleton className='absolute inset-3 rounded-lg' />
              <ScanSearch
                aria-hidden='true'
                className='relative z-10 size-7 text-primary motion-safe:animate-pulse'
              />
            </div>
            <div className='text-center'>
              <p className='text-sm font-semibold'>Loading satellite image</p>
              <p className='mt-1 text-xs text-muted-foreground'>Preparing the evidence…</p>
            </div>
          </div>
        )}
      </div>

      <div
        className={cn(
          'absolute left-0 top-0 transition-opacity duration-200',
          isImageLoading || imageError ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          width: imageWidth,
          height: imageHeight,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'top left',
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt='Satellite image with the possible facility highlighted'
          width={imageWidth}
          height={imageHeight}
          className='block max-w-none select-none'
          draggable={false}
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
        <div
          className='absolute rounded-sm border-2 border-primary shadow-[0_0_0_1px_var(--background)]'
          style={{
            left: bbox.x - bbox.width / 2,
            top: bbox.y - bbox.height / 2,
            width: bbox.width,
            height: bbox.height,
            boxSizing: 'border-box',
          }}
          aria-hidden='true'
        />
      </div>
    </div>
  );
}
