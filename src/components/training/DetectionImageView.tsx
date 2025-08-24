import { useState, useRef, useEffect } from 'react';
import {
  TransformWrapper,
  TransformComponent,
  type ReactZoomPanPinchRef,
} from 'react-zoom-pan-pinch';
import type { RoboflowPrediction } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BoundingBoxOverlayProps {
  prediction: RoboflowPrediction;
  imageWidth: number;
  imageHeight: number;
  visual: {
    emoji: string;
    displayName: string;
  };
}

function BoundingBoxOverlay({
  prediction,
  imageWidth,
  imageHeight,
  visual,
}: BoundingBoxOverlayProps) {
  // Calculate bounding box position and size as percentages
  const bboxLeft = ((prediction.x - prediction.width / 2) / imageWidth) * 100;
  const bboxTop = ((prediction.y - prediction.height / 2) / imageHeight) * 100;
  const bboxWidth = (prediction.width / imageWidth) * 100;
  const bboxHeight = (prediction.height / imageHeight) * 100;

  // Ensure bounding box stays within image bounds
  const clampedLeft = Math.max(0, Math.min(100 - bboxWidth, bboxLeft));
  const clampedTop = Math.max(0, Math.min(100 - bboxHeight, bboxTop));
  const clampedWidth = Math.min(bboxWidth, 100 - clampedLeft);
  const clampedHeight = Math.min(bboxHeight, 100 - clampedTop);

  return (
    <>
      {/* Bounding box overlay */}
      <div
        className='absolute border-2 border-red-500 border-dashed shadow-lg'
        style={{
          left: `${clampedLeft}%`,
          top: `${clampedTop}%`,
          width: `${clampedWidth}%`,
          height: `${clampedHeight}%`,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          pointerEvents: 'none',
        }}
      />

      {/* Detection label */}
      <div
        className='absolute bg-red-500 text-white text-[8px] px-2 py-[2px] rounded shadow-lg'
        style={{
          left: `${Math.max(clampedLeft - 5, 0)}%`,
          top: `${Math.max(clampedTop - 2)}%`,
          transform: 'translateY(-100%)',
        }}
      >
        {visual.displayName} ({Math.round(prediction.confidence * 100)}%)
      </div>
    </>
  );
}

interface DetectionImageViewProps {
  prediction: RoboflowPrediction;
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  visual: {
    emoji: string;
    displayName: string;
  };
}

/**
 * DetectionImageView - Displays an image with a detected object highlighted
 *
 * This component automatically positions the view to center on the detected object
 * when the prediction changes. It uses react-zoom-pan-pinch for zoom and pan functionality.
 *
 * The positioning logic:
 * 1. Calculates the center of the detection in image coordinates
 * 2. Converts to viewport-relative coordinates (where 0,0 is viewport center)
 * 3. Applies dynamic offsets based on detection position for optimal centering
 * 4. Uses setTransform to programmatically position the view
 */
export function DetectionImageView({
  prediction,
  imageUrl,
  imageWidth,
  imageHeight,
  visual,
}: DetectionImageViewProps) {
  console.log(
    JSON.stringify({
      prediction,
      imageWidth,
      imageHeight,
    })
  );
  const [imageLoaded, setImageLoaded] = useState(false);
  const transformRef = useRef<ReactZoomPanPinchRef | null>(null);

  // Calculate initial scale and position to focus on detection
  const initialScale = 3;

  // Update transform position when prediction changes
  useEffect(() => {
    if (transformRef.current && imageLoaded) {
      // Calculate the position to center the detection in the viewport
      // The viewport is 400px height, so we need to account for that
      // Note: react-zoom-pan-pinch uses a coordinate system where (0,0) is the center of the viewport
      // Positive X moves right, positive Y moves down
      const viewportHeight = 400;
      const viewportWidth = 400; // Assuming square viewport for now

      // Calculate the center of the detection in image coordinates
      const detectionCenterX = prediction.x;
      const detectionCenterY = prediction.y;

      // Calculate the position needed to center the detection
      // We want the detection to appear in the center of the viewport
      // The transform coordinates are relative to the viewport center
      const centerX = -(detectionCenterX - viewportWidth / 2);
      const centerY = -(detectionCenterY - viewportHeight / 2);

      // Apply additional offset to better center the detection
      // Based on the examples, we need to adjust the positioning
      // The offset varies based on the detection position - further right/down needs more offset
      // This accounts for the fact that detections on the right side of the image need more leftward offset
      // and detections on the bottom need more upward offset to appear centered
      const offsetX = Math.max(
        50,
        Math.abs(detectionCenterX - viewportWidth / 2) * 0.3
      );
      const offsetY = Math.max(
        100,
        Math.abs(detectionCenterY - viewportHeight / 2) * 0.4
      );

      // Ensure we don't apply excessive offsets for detections near the center
      const maxOffsetX = 200;
      const maxOffsetY = 300;
      const clampedOffsetX = Math.min(offsetX, maxOffsetX);
      const clampedOffsetY = Math.min(offsetY, maxOffsetY);

      const adjustedCenterX = centerX - clampedOffsetX;
      const adjustedCenterY = centerY - clampedOffsetY;

      console.log(
        JSON.stringify({
          detectionCenterX,
          detectionCenterY,
          viewportWidth,
          viewportHeight,
          centerX,
          centerY,
          offsetX,
          offsetY,
          clampedOffsetX,
          clampedOffsetY,
          adjustedCenterX,
          adjustedCenterY,
          initialScale,
        })
      );

      // Use the transform ref to set the position
      transformRef.current.setTransform(
        adjustedCenterX,
        adjustedCenterY,
        initialScale
      );
    }
  }, [prediction, imageLoaded, initialScale]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detection View</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='relative bg-gray-100 rounded-lg overflow-hidden'>
          {!imageLoaded && (
            <div className='absolute inset-0 flex items-center justify-center'>
              <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
            </div>
          )}

          <div className='relative overflow-hidden rounded-lg bg-gray-200 border border-gray-300'>
            <TransformWrapper
              ref={transformRef}
              initialScale={initialScale}
              minScale={0.5}
              maxScale={4}
              centerOnInit={false}
              initialPositionX={0}
              initialPositionY={0}
              limitToBounds={false}
              doubleClick={{ step: 1.5 }}
              onPanningStop={(ref) => {
                console.log(
                  'Panning stopped',
                  JSON.stringify({
                    scale: ref.state.scale,
                    positionX: ref.state.positionX,
                    positionY: ref.state.positionY,
                  })
                );
              }}
            >
              <TransformComponent
                wrapperClass='w-full h-[400px]'
                contentClass='w-full h-full'
              >
                <div className='relative w-full h-full'>
                  <img
                    src={imageUrl}
                    alt={`Image with ${visual.displayName} detection`}
                    className='w-full h-auto object-contain'
                    onLoad={() => setImageLoaded(true)}
                  />

                  <BoundingBoxOverlay
                    prediction={prediction}
                    imageWidth={imageWidth}
                    imageHeight={imageHeight}
                    visual={visual}
                  />
                </div>
              </TransformComponent>
            </TransformWrapper>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
