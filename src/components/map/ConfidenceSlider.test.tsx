import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfidenceSlider } from './ConfidenceSlider';

describe('ConfidenceSlider', () => {
  it('displays confidence as a percentage and reports numeric changes', async () => {
    const onConfidenceChange = vi.fn();

    render(
      <ConfidenceSlider
        confidenceThreshold={0.7}
        onConfidenceChange={onConfidenceChange}
      />
    );

    expect(screen.getByText('Confidence: 70%')).toBeInTheDocument();

    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '0.8' } });

    expect(onConfidenceChange).toHaveBeenLastCalledWith(0.8);
  });
});
