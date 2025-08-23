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
    <div className='mt-2'>
      <div className='text-xs text-gray-300 mb-1'>
        Confidence: {Math.round(confidenceThreshold * 100)}%
      </div>
      <input
        type='range'
        min='0'
        max='1'
        step={CONFIDENCE_SLIDER_STEP}
        value={confidenceThreshold}
        onChange={(e) => onConfidenceChange(Number(e.target.value))}
        className='w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer slider'
      />
    </div>
  );
}
