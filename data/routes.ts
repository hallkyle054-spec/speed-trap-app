import { LatLng, distanceToPath } from './geo';
import { Zone } from './zones';

export type SavedRoute = {
  id: string;
  title: string;
  /** 'A484 coast road · 41 min' */
  sub: string;
  /** The corridor the route follows, used to decide which zones sit on it. */
  path: LatLng[];
};

/** Drops anything malformed rather than counting zones against broken geometry. */
export function parseRoutes(raw: unknown): SavedRoute[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is SavedRoute => {
    const c = r as Partial<SavedRoute>;
    return (
      typeof c?.id === 'string' &&
      typeof c.title === 'string' &&
      typeof c.sub === 'string' &&
      Array.isArray(c.path) &&
      c.path.length >= 2 &&
      c.path.every(
        p =>
          typeof (p as LatLng)?.latitude === 'number' &&
          Number.isFinite((p as LatLng).latitude) &&
          typeof (p as LatLng)?.longitude === 'number' &&
          Number.isFinite((p as LatLng).longitude),
      )
    );
  });
}

/** How close a zone has to come to the corridor to count as on the route. */
const CORRIDOR_M = 500;

/**
 * Fixture routes, from the design handoff.
 *
 * The counts on the Routes tab are derived from the zone list rather than
 * stored, so they follow whatever the feed publishes today. With the committed
 * zone fixture that reads 1 / 1 / 0 — the design mock's 3 / 1 / 0 counted zones
 * that are not in the fixture.
 */
export const fixtureRoutes: SavedRoute[] = [
  {
    id: 'r1',
    title: 'Home → Llanelli',
    sub: 'A484 coast road · 41 min',
    path: [
      { latitude: 51.8558, longitude: -4.311 }, // Carmarthen
      { latitude: 51.7817, longitude: -4.3486 }, // Llangain
      { latitude: 51.737, longitude: -4.308 }, // Kidwelly
      { latitude: 51.694, longitude: -4.223 }, // Pwll
      { latitude: 51.68, longitude: -4.16 }, // Llanelli
    ],
  },
  {
    id: 'r2',
    title: 'School run',
    sub: 'Nantgaredig → Carmarthen · 14 min',
    path: [
      { latitude: 51.8676, longitude: -4.1889 }, // Nantgaredig
      { latitude: 51.866, longitude: -4.24 },
      { latitude: 51.8558, longitude: -4.311 }, // Carmarthen
    ],
  },
  {
    id: 'r3',
    title: 'Weekend · Llandovery',
    sub: 'A40 east · 52 min',
    path: [
      { latitude: 51.883, longitude: -3.993 }, // Llandeilo
      { latitude: 51.929, longitude: -3.878 },
      { latitude: 51.9945, longitude: -3.7985 }, // Llandovery
    ],
  },
];

/** The zones sitting on this route, in the order the feed lists them. */
export const zonesOnRoute = (route: SavedRoute, zones: readonly Zone[]): Zone[] =>
  zones.filter(z => z.path.some(point => distanceToPath(point, route.path) <= CORRIDOR_M));
