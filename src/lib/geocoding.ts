import { MAPBOX_API_KEY } from './constants';

// Geocoding function to convert coordinates to readable location
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_API_KEY}&types=place&limit=5`
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      // Look for the most general location (city, neighborhood, etc.)
      for (const feature of data.features) {
        const placeName = feature.place_name;
        const parts = placeName.split(', ');

        // Return the first part (most general location)
        if (parts.length > 0) {
          return parts[0];
        }
      }

      // Fallback to first feature's main name
      return data.features[0].place_name.split(',')[0];
    }

    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
