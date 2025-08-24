import React from 'react';
import type { RoboflowPrediction } from '../../../convex/lib/roboflow';
import { getVisualForClass } from '@/lib/constants';

// Helper function to convert Tailwind bg classes to hex colors
function getStrokeColor(bgClass: string): string {
  const colorMap: Record<string, string> = {
    'bg-gray-300': '#d1d5db',
    'bg-green-300': '#86efac',
    'bg-red-300': '#fca5a5',
    'bg-yellow-300': '#fde047',
    'bg-blue-300': '#93c5fd',
    'bg-cyan-300': '#67e8f9',
  };
  return colorMap[bgClass] || '#3b82f6'; // Default to blue if not found
}

interface BoundingBoxOverlayProps {
  predictions: RoboflowPrediction[];
  imageWidth: number;
  imageHeight: number;
  onBoxClick?: (prediction: RoboflowPrediction) => void;
  selectedPrediction?: RoboflowPrediction | null;
}

export function BoundingBoxOverlay({
  predictions,
  imageWidth,
  imageHeight,
  onBoxClick,
  selectedPrediction,
}: BoundingBoxOverlayProps) {
  if (!predictions.length) return null;

  return (
    <svg
      className='absolute inset-0 w-full h-full pointer-events-none'
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      style={{ pointerEvents: 'none' }}
    >
      {predictions.map((prediction, index) => {
        const visual = getVisualForClass(prediction.class);
        const isSelected = selectedPrediction === prediction;

        return (
          <g key={index} style={{ pointerEvents: 'auto' }}>
            {/* Bounding box */}
            <rect
              x={prediction.x - prediction.width / 2}
              y={prediction.y - prediction.height / 2}
              width={prediction.width}
              height={prediction.height}
              fill='none'
              stroke={isSelected ? '#ffffff' : getStrokeColor(visual.bgClass)}
              strokeWidth={isSelected ? 3 : 2}
              strokeDasharray={isSelected ? '5,5' : 'none'}
              className='cursor-pointer hover:stroke-2'
              onClick={() => onBoxClick?.(prediction)}
            />

            {/* Confidence label */}
            <text
              x={prediction.x - prediction.width / 2}
              y={prediction.y - prediction.height / 2 - 5}
              fontSize='12'
              fill='#ffffff'
              stroke='#000000'
              strokeWidth='3'
              textAnchor='start'
              className='pointer-events-none font-bold'
            >
              {visual.emoji} {Math.round(prediction.confidence * 100)}%
            </text>

            {/* Class label */}
            <text
              x={prediction.x + prediction.width / 2}
              y={prediction.y + prediction.height / 2 + 15}
              fontSize='10'
              fill='#ffffff'
              stroke='#000000'
              strokeWidth='3'
              textAnchor='end'
              className='pointer-events-none font-bold'
            >
              {visual.displayName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
