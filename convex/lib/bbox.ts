/**
 * Bounding box representation with pixel coordinates
 */
export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculate intersection area of two bounding boxes
 */
export function bboxIntersectionArea(
  bbox1: BBox,
  bbox2: BBox
): number {
  const x1 = Math.max(bbox1.x, bbox2.x);
  const y1 = Math.max(bbox1.y, bbox2.y);
  const x2 = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width);
  const y2 = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height);

  if (x2 <= x1 || y2 <= y1) return 0;
  return (x2 - x1) * (y2 - y1);
}

/**
 * Check if two bounding boxes overlap by at least the given threshold
 * @param overlapThreshold - Minimum overlap ratio (0-1), e.g., 0.75 for 75%
 */
export function bboxOverlapMeetsThreshold(
  bbox1: BBox,
  bbox2: BBox,
  overlapThreshold: number = 0.75
): boolean {
  const area1 = bbox1.width * bbox1.height;
  const area2 = bbox2.width * bbox2.height;
  const intersection = bboxIntersectionArea(bbox1, bbox2);

  if (intersection === 0) return false;

  const overlap1 = intersection / area1;
  const overlap2 = intersection / area2;

  // Both boxes must have at least threshold overlap
  return overlap1 >= overlapThreshold && overlap2 >= overlapThreshold;
}
