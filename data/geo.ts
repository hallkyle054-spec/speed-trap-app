export type LatLng = { latitude: number; longitude: number };

/**
 * A map camera: where it is centred and how much ground it covers. Shaped to
 * match `react-native-maps`' Region so it can be handed straight to a MapView,
 * but declared here so nothing needs the native module just to remember one.
 */
export type Region = LatLng & { latitudeDelta: number; longitudeDelta: number };

const R = 6_371_008.8; // mean Earth radius, metres
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const lat1 = rad(a.latitude);
  const lat2 = rad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Equirectangular projection to local metres about `origin`. Good to a few
 * centimetres over the tens of kilometres this app ever measures, and it lets
 * us do plane geometry against a road segment.
 */
function project(p: LatLng, origin: LatLng): { x: number; y: number } {
  return {
    x: rad(p.longitude - origin.longitude) * Math.cos(rad(origin.latitude)) * R,
    y: rad(p.latitude - origin.latitude) * R,
  };
}

/** Shortest distance in metres from `point` to a polyline. */
export function distanceToPath(point: LatLng, path: readonly LatLng[]): number {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  if (path.length === 1) return haversine(point, path[0]);

  const origin = point;
  let best = Number.POSITIVE_INFINITY;

  for (let i = 0; i < path.length - 1; i++) {
    const a = project(path[i], origin);
    const b = project(path[i + 1], origin);
    const vx = b.x - a.x;
    const vy = b.y - a.y;
    const len2 = vx * vx + vy * vy;
    // `point` is the origin, so the projection is measured from (0, 0).
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(a.x * vx + a.y * vy) / len2));
    const dx = a.x + t * vx;
    const dy = a.y + t * vy;
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/** Total length of a polyline in metres. */
export function pathLength(path: readonly LatLng[]): number {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += haversine(path[i], path[i + 1]);
  return total;
}

/**
 * Distance as the UI writes it: metres below a kilometre, one decimal above.
 * Tabular figures, so the width is stable as it counts down.
 */
/**
 * How far `to` lies east and north of `from`, in metres. Equirectangular, which
 * is exact enough over the few kilometres a driver can see ahead and costs one
 * cosine rather than a haversine per point.
 */
export function offsetMetres(from: LatLng, to: LatLng): { east: number; north: number } {
  const lat = (from.latitude * Math.PI) / 180;
  return {
    east: (to.longitude - from.longitude) * 111_320 * Math.cos(lat),
    north: (to.latitude - from.latitude) * 110_540,
  };
}

export function formatDistance(metres: number): string {
  if (!Number.isFinite(metres)) return '—';
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

export const MS_TO_MPH = 2.236936;

export const metresPerSecondToMph = (mps: number) => Math.max(0, Math.round(mps * MS_TO_MPH));
