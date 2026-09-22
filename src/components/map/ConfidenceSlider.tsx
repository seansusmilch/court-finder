import type { CSSProperties } from 'react';
import { CONFIDENCE_SLIDER_STEP } from '@/lib/constants';
interface ConfidenceSliderProps {
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
}

export function ConfidenceSlider({
  confidenceThreshold,
  onConfidenceChange,
}: ConfidenceSliderProps) {
  return (
    <div className='mt-2 space-y-2'>
      <div className='flex items-center justify-between text-xs text-muted-foreground'>
        <span>Show possible facilities at or above this model confidence</span>
      </div>
      <input
        aria-label='Minimum model confidence'
        aria-valuetext={`${Math.round(confidenceThreshold * 100)} percent`}
        type='range'
        min='0'
        max='1'
        step={CONFIDENCE_SLIDER_STEP}
        value={confidenceThreshold}
        onChange={(e) => onConfidenceChange(Number(e.target.value))}
        style={{ '--value': `${confidenceThreshold * 100}%` } as CSSProperties}
        className='w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider'
      />
    </div>
  );
}
