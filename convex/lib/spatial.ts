export function metersToLatDegrees(meters: number) {
  return meters / 111_320;
}

export function metersToLngDegrees(meters: number, atLat: number) {
  return meters / (111_320 * Math.max(0.01, Math.cos((atLat * Math.PI) / 180)));
}

/**
 * Compute the great-circle distance between two WGS84 points using the
 * haversine formula.
 *
 * - Inputs `a` and `b` are latitude/longitude in degrees
 * - Returns distance in meters
 * - Uses Earth mean radius R = 6,371,000 m and clamps asin argument for
 *   numerical stability
 */
export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6_371_000; // meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
