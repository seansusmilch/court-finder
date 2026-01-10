import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfidenceSlider } from '../ConfidenceSlider';
import type { MapSectionConfig } from '../shared/types';

export interface ConfidenceSectionProps {
  confidenceThreshold: number;
  onConfidenceChange: (value: number) => void;
  className?: string;
  showPercentage?: boolean;
}

export function ConfidenceSection({
  confidenceThreshold,
  onConfidenceChange,
  className,
  showPercentage = true,
}: ConfidenceSectionProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className='flex items-center gap-2'>
        <SlidersHorizontal className='h-4 w-4 text-muted-foreground' />
        <h3 className='font-display text-sm font-semibold tracking-tight'>
          Confidence
        </h3>
        {showPercentage && (
          <span className='ml-auto text-xs font-mono text-muted-foreground'>
            {Math.round(confidenceThreshold * 100)}%
          </span>
        )}
      </div>
      <ConfidenceSlider
        confidenceThreshold={confidenceThreshold}
        onConfidenceChange={onConfidenceChange}
      />
    </div>
  );
}

/**
 * Creates a section config for the confidence section
 */
export function createConfidenceSection(
  props: ConfidenceSectionProps
): MapSectionConfig {
  return {
    id: 'confidence',
    order: 2,
    renderContent: () => <ConfidenceSection {...props} />,
  };
}
