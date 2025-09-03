/**
 * Convert tile coordinates to the center latitude and longitude
 */
export function tileCenterLatLng(z: number, x: number, y: number) {
  const n = Math.pow(2, z);
  const west = (x / n) * 360 - 180;
  const east = ((x + 1) / n) * 360 - 180;
  const northRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y / n))));
  const southRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * ((y + 1) / n))));
  const north = (northRad * 180) / Math.PI;
  const south = (southRad * 180) / Math.PI;
  return { lat: (north + south) / 2, lng: (west + east) / 2 };
}
