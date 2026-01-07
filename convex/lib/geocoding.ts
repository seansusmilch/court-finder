import { ENV_VARS } from './constants';

// Geocoding function to convert coordinates to readable location
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  const apiStartTs = Date.now();

  try {
    const MAPBOX_API_KEY = process.env[ENV_VARS.MAPBOX_API_KEY];
    if (!MAPBOX_API_KEY) {
      console.error('error: missing api key', {
        lat,
        lng,
        hasApiKey: false,
      });
      throw new Error("MAPBOX_API_KEY environment variable not set");
    }

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=***&types=place&limit=5`;

    console.log('request', {
      url: `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=***&types=place&limit=5`,
      lat,
      lng,
      hasApiKey: !!MAPBOX_API_KEY,
    });

    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_API_KEY}&types=place&limit=5`
    );

    if (!response.ok) {
      console.error('error: http failure', {
        url,
        status: response.status,
        statusText: response.statusText,
        lat,
        lng,
        durationMs: Date.now() - apiStartTs,
      });
      // Fallback to coordinates if geocoding fails
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    const data = await response.json();

    let result: string | undefined;
    if (data.features && data.features.length > 0) {
      // Look for the most general location (city, neighborhood, etc.)
      for (const feature of data.features) {
        const placeName = feature.place_name;
        const parts = placeName.split(', ');

        // Return the first part (most general location)
        if (parts.length > 0) {
          result = parts[0];
          break;
        }
      }

      // Fallback to first feature's main name if loop didn't assign result
      if (!result) {
        result = data.features[0].place_name.split(',')[0];
      }
    }

    // Final fallback to coordinates if geocoding fails or no result found
    if (!result) {
      result = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }

    console.log('response', {
      lat,
      lng,
      durationMs: Date.now() - apiStartTs,
      featuresCount: data.features?.length ?? 0,
      result,
    });

    return result;
  } catch (error) {
    console.error('error: request failed', {
      url: `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=***&types=place&limit=5`,
      lat,
      lng,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
      durationMs: Date.now() - apiStartTs,
    });
    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
