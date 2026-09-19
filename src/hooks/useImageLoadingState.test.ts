import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useImageLoadingState } from './useImageLoadingState';

describe('useImageLoadingState', () => {
  it('treats transitioning cached data as not actually loading', () => {
    const { result } = renderHook(() => useImageLoadingState(true, 'old.jpg'));

    expect(result.current.isImageLoading).toBe(false);
    expect(result.current.isActuallyLoading).toBe(false);
  });

  it('marks a new image URL as loading until the viewer reports completion', () => {
    const { result, rerender } = renderHook(
      ({ transitioning, url }) => useImageLoadingState(transitioning, url),
      { initialProps: { transitioning: false, url: 'one.jpg' } }
    );

    act(() => result.current.handleImageLoadingChange(false));
    expect(result.current.isActuallyLoading).toBe(false);

    rerender({ transitioning: false, url: 'two.jpg' });
    expect(result.current.isActuallyLoading).toBe(true);
  });
});
