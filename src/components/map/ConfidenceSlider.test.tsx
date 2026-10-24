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

    const slider = screen.getByRole('slider', { name: 'Minimum model confidence' });
    expect(slider).toHaveAttribute('aria-valuetext', '70 percent');
    expect(slider).toHaveValue('0.7');
    fireEvent.change(slider, { target: { value: '0.8' } });

    expect(onConfidenceChange).toHaveBeenLastCalledWith(0.8);
  });
});
