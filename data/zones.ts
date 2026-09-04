import { shortDayLabel } from './dates';
import { LatLng, distanceToPath, pathLength } from './geo';

/**
 * The premise the whole interface is built on: the partnership publishes
 * enforcement *zones*, not live camera positions. Nothing here may describe a
 * zone as a confirmed camera.
 *
 * The design assumed a daily list with published enforcement windows
 * ('08:00–13:00'). It does not exist — the publisher releases a list of
 * enforcement *sites* with no dates or times. Anything the UI cannot source is
 * gone from this model rather than guessed at; see the README.
 */

export type ZoneStatus =
  /** On the most recent published list. */
  | 'listed'
  /** Was on an earlier list and has since been dropped from it. */
  | 'removed';

export type Zone = {
  id: string;
  /** 'A484' */
  road: string;
  /** 'Llangain → Bancyfelin' */
  name: string;
  /** The posted limit, when the source gives one. Never inferred. */
  limitMph: number | null;
  /** The sheet's plain-language provenance line. */
  note: string;
  /** ISO date this site first appeared on a published list. */
  firstListed: string;
  /** ISO date of the most recent list this site appeared on. */
  lastListed: string;
  /** The stretch of road the site covers. */
  path: LatLng[];
};

const DAY_MS = 86_400_000;

/**
 * 'YYYY-MM-DD' as local midnight. `Date.parse` would read it as UTC, which
 * shifts the day either side of the meridian.
 */
function parseDay(iso: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return NaN;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
}

/** The date of the newest list represented in `zones`. */
export function latestListing(zones: readonly Zone[]): string | null {
  let best: string | null = null;
  for (const z of zones) {
    if (Number.isNaN(parseDay(z.lastListed))) continue;
    if (best === null || z.lastListed > best) best = z.lastListed;
  }
  return best;
}

/**
 * A site is `listed` when it appeared on the newest list we hold, and
 * `removed` once a later list has come in without it. Derived rather than
 * stored, so it follows whatever the feed last published.
 */
export function statusOf(zone: Zone, latest: string | null): ZoneStatus {
  if (!latest) return 'listed';
  return zone.lastListed >= latest ? 'listed' : 'removed';
}

export const limitLabel = (z: Zone) => (z.limitMph == null ? 'Not published' : `${z.limitMph} mph`);

/** The status kicker on the detail sheet. */
export const statusLabel = (status: ZoneStatus) =>
  status === 'listed' ? 'On the published list' : 'Removed from the list';

/** The note under each row. Never omits the disclaimer. */
export function rowNote(zone: Zone, status: ZoneStatus): string {
  return status === 'listed'
    ? 'Published site · camera not confirmed'
    : `Removed from the list ${shortDate(zone.lastListed)} · camera not confirmed`;
}

export function shortDate(iso: string): string {
  const day = parseDay(iso);
  if (Number.isNaN(day)) return 'unknown';
  return shortDayLabel(new Date(day));
}

/** 'Listed since 12 Aug' — the closest thing to provenance the source gives. */
export const listedSince = (zone: Zone) => shortDate(zone.firstListed);

export function daysSinceListed(zone: Zone, now: Date): number {
  const last = parseDay(zone.lastListed);
  if (Number.isNaN(last)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((new Date(now).setHours(0, 0, 0, 0) - last) / DAY_MS));
}

export const zoneLength = (z: Zone) => pathLength(z.path);

export const distanceTo = (z: Zone, from: LatLng) => distanceToPath(from, z.path);

/** The zone whose road stretch is closest to `from`, or null when empty. */
export function nearestZone(zones: readonly Zone[], from: LatLng): Zone | null {
  let best: Zone | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const z of zones) {
    const d = distanceTo(z, from);
    if (d < bestDistance) {
      bestDistance = d;
      best = z;
    }
  }
  return best;
}

/**
 * Fixture list — Carmarthenshire, kept for tests and so the UI is exercisable
 * before the feed exists.
 *
 * ⚠️ INVENTED. The road geometry is approximate and the sites are illustrative.
 * The app says so on screen whenever no feed is configured. Do not drive by it.
 */
export const fixtureZones: Zone[] = [
  {
    id: 'z1',
    road: 'A484',
    name: 'Llangain → Bancyfelin',
    limitMph: 60,
    note: 'Illustrative site from the design fixture.',
    firstListed: daysAgo(96),
    lastListed: daysAgo(0),
    path: [
      { latitude: 51.7817, longitude: -4.3486 },
      { latitude: 51.796, longitude: -4.38 },
      { latitude: 51.818, longitude: -4.42 },
    ],
  },
  {
    id: 'z2',
    road: 'A40',
    name: 'Nantgaredig',
    limitMph: 50,
    note: 'Illustrative site from the design fixture.',
    firstListed: daysAgo(400),
    lastListed: daysAgo(0),
    path: [
      { latitude: 51.866, longitude: -4.178 },
      { latitude: 51.8676, longitude: -4.1889 },
      { latitude: 51.8695, longitude: -4.202 },
    ],
  },
  {
    id: 'z3',
    road: 'A48',
    name: 'Cross Hands, eastbound',
    limitMph: 70,
    note: 'Dual carriageway stretch; the eastbound side only.',
    firstListed: daysAgo(210),
    lastListed: daysAgo(0),
    path: [
      { latitude: 51.812, longitude: -4.098 },
      { latitude: 51.815, longitude: -4.07 },
      { latitude: 51.818, longitude: -4.048 },
    ],
  },
  {
    id: 'z4',
    road: 'A483',
    name: 'Ammanford, Pontamman Rd',
    limitMph: 30,
    note: 'Illustrative site from the design fixture.',
    firstListed: daysAgo(45),
    lastListed: daysAgo(0),
    path: [
      { latitude: 51.793, longitude: -3.986 },
      { latitude: 51.7975, longitude: -3.979 },
    ],
  },
  {
    id: 'z5',
    road: 'A4069',
    name: 'Llandeilo, Ffairfach',
    limitMph: null,
    note: 'No speed limit is published for this site.',
    firstListed: daysAgo(30),
    lastListed: daysAgo(0),
    path: [
      { latitude: 51.876, longitude: -3.997 },
      { latitude: 51.87, longitude: -3.993 },
    ],
  },
  {
    id: 'z6',
    road: 'B4300',
    name: 'Golden Grove',
    limitMph: 60,
    note: 'Dropped from the list at the last update.',
    firstListed: daysAgo(300),
    lastListed: daysAgo(21),
    path: [
      { latitude: 51.858, longitude: -4.056 },
      { latitude: 51.853, longitude: -4.033 },
    ],
  },
];

function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * Stands in for the device position until location permission is granted, and
 * is placed to reproduce the design's nearest-zone state (A484, ~2.4 km).
 */
export const FALLBACK_ORIGIN: LatLng = { latitude: 51.77, longitude: -4.32 };

/** Frames the county on first paint. */
export const COUNTY_REGION = {
  latitude: 51.83,
  longitude: -4.18,
  latitudeDelta: 0.42,
  longitudeDelta: 0.62,
};
