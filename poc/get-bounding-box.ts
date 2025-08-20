import { generateMapboxStaticImageUrl } from './mapbox-fetch-satellite';

// Configuration constants for bounding box calculations
const BOUNDING_BOX_SETTINGS = {
  imageRadiusCount: 2,
  imageSizeDegrees: 0.0136,
} as const;

// Type definitions for better code clarity
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

/**
 * Validates that a bounding box has valid coordinates
 * @param boundingBox - The bounding box to validate
 * @returns Validation result with any errors found
 */
export function validateBoundingBox(
  boundingBox: BoundingBox
): BoundingBoxValidationResult {
  const { minLong, minLat, maxLong, maxLat } = boundingBox;
  const errors: string[] = [];

  // Check for valid latitude range (-90 to 90)
  if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
    errors.push('Latitude values must be between -90 and 90 degrees');
  }

  // Check for valid longitude range (-180 to 180)
  if (minLong < -180 || minLong > 180 || maxLong < -180 || maxLong > 180) {
    errors.push('Longitude values must be between -180 and 180 degrees');
  }

  // Ensure max values are greater than min values
  if (maxLat <= minLat) {
    errors.push('maxLat must be greater than minLat');
  }

  if (maxLong <= minLong) {
    errors.push('maxLong must be greater than minLong');
  }

  // Check for reasonable size (prevent extremely small or large boxes)
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

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a bounding box centered on given coordinates
 * @param latitude - The latitude of the center point (-90 to 90)
 * @param longitude - The longitude of the center point (-180 to 180)
 * @returns A valid bounding box object
 * @throws Error if coordinates are invalid
 */
export function createBoundingBoxFromCenter(
  latitude: number,
  longitude: number
): BoundingBox {
  // Validate input coordinates
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

  // Calculate the total span for the bounding box
  const totalSpan = imageRadiusCount * imageSizeDegrees;

  // Create the bounding box ensuring proper min/max relationships
  const boundingBox: BoundingBox = {
    minLong: longitude - totalSpan,
    maxLong: longitude + totalSpan,
    minLat: latitude - totalSpan,
    maxLat: latitude + totalSpan,
  };

  // Validate the resulting bounding box
  const validation = validateBoundingBox(boundingBox);
  if (!validation.isValid) {
    throw new Error(
      `Generated bounding box is invalid: ${validation.errors.join(', ')}`
    );
  }

  return boundingBox;
}

/**
 * Splits a bounding box into smaller sub-boxes for image processing
 * @param boundingBox - The parent bounding box to split
 * @returns An array of smaller bounding boxes
 * @throws Error if the input bounding box is invalid
 */
export function splitBoundingBoxIntoSubBoxes(
  boundingBox: BoundingBox
): BoundingBox[] {
  // Validate input bounding box
  const validation = validateBoundingBox(boundingBox);
  if (!validation.isValid) {
    throw new Error(`Invalid bounding box: ${validation.errors.join(', ')}`);
  }

  const { minLong, minLat, maxLong, maxLat } = boundingBox;
  const { imageSizeDegrees } = BOUNDING_BOX_SETTINGS;

  // Calculate the number of sub-boxes needed in each dimension
  const longSteps = Math.ceil((maxLong - minLong) / imageSizeDegrees);
  const latSteps = Math.ceil((maxLat - minLat) / imageSizeDegrees);

  const subBoxes: BoundingBox[] = [];

  // Generate sub-boxes by iterating through the grid
  for (let longIndex = 0; longIndex < longSteps; longIndex++) {
    const subBoxMinLong = minLong + longIndex * imageSizeDegrees;
    const subBoxMaxLong = Math.min(subBoxMinLong + imageSizeDegrees, maxLong);

    for (let latIndex = 0; latIndex < latSteps; latIndex++) {
      const subBoxMinLat = minLat + latIndex * imageSizeDegrees;
      const subBoxMaxLat = Math.min(subBoxMinLat + imageSizeDegrees, maxLat);

      const subBox: BoundingBox = {
        minLong: subBoxMinLong,
        maxLong: subBoxMaxLong,
        minLat: subBoxMinLat,
        maxLat: subBoxMaxLat,
      };

      // Validate each sub-box before adding
      const subBoxValidation = validateBoundingBox(subBox);
      if (!subBoxValidation.isValid) {
        console.warn(
          `Warning: Generated sub-box is invalid: ${subBoxValidation.errors.join(
            ', '
          )}`
        );
        continue; // Skip invalid sub-boxes
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

// Example usage and testing
if (require.main === module) {
  try {
    console.log('Testing bounding box creation and splitting...\n');

    // Test with Chicago coordinates
    const chicagoLat = 41.9442;
    const chicagoLong = -87.6952;

    console.log(
      `Creating bounding box centered at (${chicagoLat}, ${chicagoLong})...`
    );
    const boundingBox = createBoundingBoxFromCenter(chicagoLat, chicagoLong);
    console.log('Generated bounding box:', boundingBox);

    // Validate the generated bounding box
    const validation = validateBoundingBox(boundingBox);
    console.log('Validation result:', validation);

    // Split into sub-boxes
    console.log('\nSplitting bounding box into sub-boxes...');
    const subBoxes = splitBoundingBoxIntoSubBoxes(boundingBox);
    console.log(`Generated ${subBoxes.length} sub-boxes`);

    // Generate image URLs for each sub-box
    console.log('\nGenerating Mapbox image URLs:');
    subBoxes.forEach((box, index) => {
      try {
        const imageUrl = generateMapboxStaticImageUrl({ bbox: box });
        console.log(`Sub-box ${index + 1}: ${imageUrl}`);
      } catch (error) {
        console.error(`Error generating URL for sub-box ${index + 1}:`, error);
      }
    });
  } catch (error) {
    console.error('Error during testing:', error);
    process.exit(1);
  }
}
