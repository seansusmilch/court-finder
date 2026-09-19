import { describe, expect, it } from 'vitest';
import { bboxIntersectionArea, bboxOverlapMeetsThreshold } from './bbox';

describe('bboxIntersectionArea', () => {
  it('returns the intersecting area for overlapping boxes', () => {
    expect(
      bboxIntersectionArea(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 }
      )
    ).toBe(25);
  });

  it('returns zero when boxes do not overlap', () => {
    expect(
      bboxIntersectionArea(
        { x: 0, y: 0, width: 4, height: 4 },
        { x: 5, y: 5, width: 4, height: 4 }
      )
    ).toBe(0);
  });
});

describe('bboxOverlapMeetsThreshold', () => {
  it('requires both boxes to meet the overlap threshold', () => {
    expect(
      bboxOverlapMeetsThreshold(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 1, y: 1, width: 10, height: 10 },
        0.75
      )
    ).toBe(true);

    expect(
      bboxOverlapMeetsThreshold(
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: 5, width: 10, height: 10 },
        0.75
      )
    ).toBe(false);
  });
});
