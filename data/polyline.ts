import { LatLng } from './geo';

/**
 * Google's encoded polyline format: signed offsets, zig-zag encoded, in
 * five-bit chunks with a continuation bit, offset by 63 to stay printable.
 *
 * Written out rather than pulled in as a dependency — it is twenty lines, and a
 * route drawn from a mis-decoded polyline would put a zone count on the wrong
 * roads without ever looking broken.
 */
export function decodePolyline(encoded: string, precision = 5): LatLng[] {
  const factor = 10 ** precision;
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    for (const axis of ['lat', 'lng'] as const) {
      let result = 0;
      let shift = 0;
      let byte: number;

      do {
        if (index >= encoded.length) return points;
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      // The low bit flags a negative value; the rest is the magnitude.
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 'lat') lat += delta;
      else lng += delta;
    }

    points.push({ latitude: lat / factor, longitude: lng / factor });
  }

  return points;
}

/**
 * Thins a route to a workable number of points. A long drive comes back with
 * thousands, and every one of them is measured against every zone.
 */
export function simplifyPath(path: readonly LatLng[], maxPoints = 400): LatLng[] {
  if (path.length <= maxPoints) return [...path];
  const step = (path.length - 1) / (maxPoints - 1);
  const out: LatLng[] = [];
  for (let i = 0; i < maxPoints; i++) out.push(path[Math.round(i * step)]);
  return out;
}
