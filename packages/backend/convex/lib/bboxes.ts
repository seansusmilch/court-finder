import { generateMapboxStaticImageUrl } from './mapbox';

const BOUNDING_BOX_SETTINGS = {
  imageRadiusCount: 2,
  imageSizeDegrees: 0.0136,
} as const;

function roundToFourDecimals(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export interface BoundingBox {
  minLong: number;
  minLat: number;
  maxLong: number;
  maxLat: number;
}

export interface BoundingBoxValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateBoundingBox(
  boundingBox: BoundingBox
): BoundingBoxValidationResult {
  const { minLong, minLat, maxLong, maxLat } = boundingBox;
  const errors: string[] = [];
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
    errors.push('Latitude values must be between -90 and 90 degrees');
  }
  if (minLong < -180 || minLong > 180 || maxLong < -180 || maxLong > 180) {
    errors.push('Longitude values must be between -180 and 180 degrees');
  }
  if (maxLat <= minLat) {
    errors.push('maxLat must be greater than minLat');
  }
  if (maxLong <= minLong) {
    errors.push('maxLong must be greater than minLong');
  }
  const latSpan = maxLat - minLat;
  const longSpan = maxLong - minLong;
  if (latSpan < 0.001) {
    errors.push(
      'Bounding box latitude span is too small (minimum 0.001 degrees)'
    );
  }
  if (longSpan < 0.001) {
    errors.push(
      'Bounding box longitude span is too small (minimum 0.001 degrees)'
    );
  }
  if (latSpan > 10) {
    errors.push('Bounding box latitude span is too large (maximum 10 degrees)');
  }
  if (longSpan > 10) {
    errors.push(
      'Bounding box longitude span is too large (maximum 10 degrees)'
    );
  }
  return { isValid: errors.length === 0, errors };
}

export function createBoundingBoxFromCenter(
  latitude: number,
  longitude: number
): BoundingBox {
  if (latitude < -90 || latitude > 90) {
    throw new Error(
      `Invalid latitude: ${latitude}. Must be between -90 and 90 degrees.`
    );
  }
  if (longitude < -180 || longitude > 180) {
    throw new Error(
      `Invalid longitude: ${longitude}. Must be between -180 and 180 degrees.`
    );
  }
  const { imageRadiusCount, imageSizeDegrees } = BOUNDING_BOX_SETTINGS;
  const totalSpan = imageRadiusCount * imageSizeDegrees;
  const boundingBox: BoundingBox = {
    minLong: roundToFourDecimals(longitude - totalSpan),
    maxLong: roundToFourDecimals(longitude + totalSpan),
    minLat: roundToFourDecimals(latitude - totalSpan),
    maxLat: roundToFourDecimals(latitude + totalSpan),
  };
  const validation = validateBoundingBox(boundingBox);
  if (!validation.isValid) {
    throw new Error(
      `Generated bounding box is invalid: ${validation.errors.join(', ')}`
    );
  }
  return boundingBox;
}

export function splitBoundingBoxIntoSubBoxes(
  boundingBox: BoundingBox
): BoundingBox[] {
  const validation = validateBoundingBox(boundingBox);
  if (!validation.isValid) {
    throw new Error(`Invalid bounding box: ${validation.errors.join(', ')}`);
  }
  const { minLong, minLat, maxLong, maxLat } = boundingBox;
  const { imageSizeDegrees } = BOUNDING_BOX_SETTINGS;
  const longSteps = Math.ceil((maxLong - minLong) / imageSizeDegrees);
  const latSteps = Math.ceil((maxLat - minLat) / imageSizeDegrees);
  const subBoxes: BoundingBox[] = [];
  for (let longIndex = 0; longIndex < longSteps; longIndex++) {
    const subBoxMinLongRaw = minLong + longIndex * imageSizeDegrees;
    const subBoxMaxLongRaw = Math.min(
      subBoxMinLongRaw + imageSizeDegrees,
      maxLong
    );
    const subBoxMinLong = roundToFourDecimals(subBoxMinLongRaw);
    const subBoxMaxLong = Math.min(
      roundToFourDecimals(subBoxMaxLongRaw),
      maxLong
    );
    for (let latIndex = 0; latIndex < latSteps; latIndex++) {
      const subBoxMinLatRaw = minLat + latIndex * imageSizeDegrees;
      const subBoxMaxLatRaw = Math.min(
        subBoxMinLatRaw + imageSizeDegrees,
        maxLat
      );
      const subBoxMinLat = roundToFourDecimals(subBoxMinLatRaw);
      const subBoxMaxLat = Math.min(
        roundToFourDecimals(subBoxMaxLatRaw),
        maxLat
      );
      const subBox: BoundingBox = {
        minLong: subBoxMinLong,
        maxLong: subBoxMaxLong,
        minLat: subBoxMinLat,
        maxLat: subBoxMaxLat,
      };
      const subBoxValidation = validateBoundingBox(subBox);
      if (!subBoxValidation.isValid) {
        continue;
      }
      subBoxes.push(subBox);
    }
  }
  if (subBoxes.length === 0) {
    throw new Error(
      'Failed to generate any valid sub-boxes from the input bounding box'
    );
  }
  return subBoxes;
}

export function generateMapboxUrlsForSubBoxes(
  subBoxes: BoundingBox[],
  accessToken: string
): string[] {
  return subBoxes.map((box) =>
    generateMapboxStaticImageUrl({ bbox: box, accessToken })
  );
}
