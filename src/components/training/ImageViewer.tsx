import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

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
  const [containerSize, setContainerSize] = useState(300);

  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const [pinchState, setPinchState] = useState<{ lastDistance: number } | null>(
    null
  );

  // Image loading state
  const [isImageLoading, setIsImageLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  // Handle image load completion
  const markImageLoaded = () => {
    setIsImageLoading(false);
    onLoadingChange?.(false);
  };

  // Reset loading state when imageUrl changes, and check if already cached
  useEffect(() => {
    setIsImageLoading(true);
    onLoadingChange?.(true);

    // Check if the image is already cached/loaded
    // Need a small delay to let the img src update first
    const checkIfLoaded = () => {
      if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
        markImageLoaded();
      }
    };

    // Check immediately and also after a short delay (for cached images)
    checkIfLoaded();
    const timeoutId = setTimeout(checkIfLoaded, 50);

    return () => clearTimeout(timeoutId);
  }, [imageUrl]);

  const handleImageLoad = () => {
    markImageLoaded();
  };

  useEffect(() => {
    if (containerRef.current) {
      setContainerSize(containerRef.current.offsetWidth);
    }
  }, [containerRef.current]);

  useEffect(() => {
    const initialPadding = 3.0;
    const newScale = Math.min(
      containerSize / (bbox.width * initialPadding),
      containerSize / (bbox.height * initialPadding)
    );
    setTransform({
      scale: newScale,
      x: containerSize / 2 - bbox.x * newScale,
      y: containerSize / 2 - bbox.y * newScale,
    });
  }, [bbox, imageWidth, imageHeight, containerSize]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const zoomFactor = 1.1;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform((prev) => {
        const newScale =
          e.deltaY < 0 ? prev.scale * zoomFactor : prev.scale / zoomFactor;
        const newX = mouseX - (mouseX - prev.x) * (newScale / prev.scale);
        const newY = mouseY - (mouseY - prev.y) * (newScale / prev.scale);
        return { scale: newScale, x: newX, y: newY };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef.current]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    containerRef.current!.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x, y });

    if (pointersRef.current.size === 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const distance = Math.hypot(dx, dy);
      setPinchState({ lastDistance: distance });
      setIsDragging(false);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x, y });
    }

    if (pointersRef.current.size === 2 && pinchState) {
      const pts = Array.from(pointersRef.current.values());
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      const distance = Math.hypot(dx, dy);
      const scaleFactor = distance / pinchState.lastDistance;

      setTransform((prev) => {
        const newScale = prev.scale * scaleFactor;
        const newX = midX - (midX - prev.x) * (newScale / prev.scale);
        const newY = midY - (midY - prev.y) * (newScale / prev.scale);
        return { scale: newScale, x: newX, y: newY };
      });

      setPinchState({ lastDistance: distance });
      return;
    }

    if (isDragging && pointersRef.current.size === 1) {
      e.preventDefault();
      setTransform({
        ...transform,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.delete(e.pointerId);
    }
    if (pointersRef.current.size < 2) {
      setPinchState(null);
    }
    if (pointersRef.current.size === 0) {
      setIsDragging(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative mx-auto rounded-lg overflow-hidden border touch-none w-full h-full max-w-[90vw] max-h-[50vh] sm:max-w-[500px] sm:max-h-[400px]',
        className
      )}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
    >
      {/* Loading skeleton overlay */}
      <div
        className={cn(
          'absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-300',
          isImageLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className='flex flex-col items-center gap-4'>
          {/* Animated satellite imagery skeleton */}
          <div className='relative'>
            <Skeleton className='w-24 h-24 rounded-lg' />
            {/* Scanning line animation */}
            <div className='absolute inset-0 overflow-hidden rounded-lg'>
              <div className='absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-scan' />
            </div>
          </div>
          <div className='flex flex-col items-center gap-1'>
            <Skeleton className='w-32 h-3 rounded-full' />
            <span className='text-sm text-muted-foreground animate-pulse'>
              Loading satellite image...
            </span>
          </div>
        </div>
      </div>

      {/* Image content */}
      <div
        className={cn(
          'transition-opacity duration-300',
          isImageLoading ? 'opacity-0' : 'opacity-100'
        )}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: 'top left',
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt='Satellite image for feedback'
          style={{ width: imageWidth, height: imageHeight, maxWidth: 'none' }}
          draggable={false}
          onLoad={handleImageLoad}
        />
        <div
          className='absolute border-2 border-red-500 rounded-sm shadow-lg'
          style={{
            left: bbox.x - bbox.width / 2,
            top: bbox.y - bbox.height / 2,
            width: bbox.width,
            height: bbox.height,
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
}
