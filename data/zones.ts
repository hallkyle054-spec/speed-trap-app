import { shortDayLabel } from './dates';
import { LatLng, distanceToPath, pathLength } from './geo';

/**
 * The premise the whole interface is built on: the partnership publishes
 * enforcement *zones*, not live camera positions. Nothing in this module may
 * describe a zone as a confirmed camera.
 */

export type ZonePhase =
  /** Inside its published window right now. */
  | 'active'
  /** Published for today, window has not opened yet. */
  | 'upcoming'
  /** Published for today, window has already closed. */
  | 'ended'
  /** Not republished in the last 7 days. */
  | 'stale';

export type Zone = {
  id: string;
  /** 'A484' */
  road: string;
  /** 'Llangain → Bancyfelin' */
  name: string;
  /** The published window as the source writes it, or null when not published today. */
  window: { from: string; to: string } | null;
  limitMph: number;
  /** The sheet's plain-language provenance line. */
  note: string;
  /** ISO date of the last time this zone appeared in a published list. */
  lastPublished: string;
  /** The stretch of road the zone covers. */
  path: LatLng[];
};

/** '08:00–13:00', or 'not today' when there is no window. */
export const hoursLabel = (z: Zone) => (z.window ? `${z.window.from}–${z.window.to}` : 'not today');

export const limitLabel = (z: Zone) => `${z.limitMph} mph`;

const STALE_AFTER_DAYS = 7;
const DAY_MS = 86_400_000;

const minutesOfDay = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

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

/**
 * 'Not republished in the last 7 days' is a rule about calendar days, so both
 * sides are floored to midnight — otherwise a list published a week ago turns
 * stale part-way through the day.
 */
export function isStale(z: Zone, now: Date): boolean {
  const last = parseDay(z.lastPublished);
  if (Number.isNaN(last)) return true;
  const today = new Date(now).setHours(0, 0, 0, 0);
  return Math.round((today - last) / DAY_MS) > STALE_AFTER_DAYS;
}

/**
 * Derived, never stored — a zone is active because the clock is inside its
 * published window, not because a field says so.
 */
export function phaseOf(z: Zone, now: Date): ZonePhase {
  if (isStale(z, now)) return 'stale';
  if (!z.window) return 'ended';
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins < minutesOfDay(z.window.from)) return 'upcoming';
  if (mins >= minutesOfDay(z.window.to)) return 'ended';
  return 'active';
}

export const isActive = (z: Zone, now: Date) => phaseOf(z, now) === 'active';

/** The one-line status kicker on the detail sheet. */
export function statusLabel(phase: ZonePhase): string {
  switch (phase) {
    case 'active':
      return 'Published for today';
    case 'upcoming':
      return 'Scheduled later today';
    case 'ended':
      return 'Published earlier today';
    case 'stale':
      return 'Stale listing';
  }
}

/** The note under each row on the Today sheet. Never omits the disclaimer. */
export function rowNote(z: Zone, phase: ZonePhase): string {
  switch (phase) {
    case 'active':
      return 'Published zone · camera not confirmed';
    case 'upcoming':
      return 'Scheduled later today · camera not confirmed';
    case 'ended':
      return 'Published earlier today · camera not confirmed';
    case 'stale':
      return `Stale — last published ${shortDate(z.lastPublished)}`;
  }
}

export function shortDate(iso: string): string {
  const day = parseDay(iso);
  if (Number.isNaN(day)) return 'unknown';
  return shortDayLabel(new Date(day));
}

export const zoneLength = (z: Zone) => pathLength(z.path);

export const distanceTo = (z: Zone, from: LatLng) => distanceToPath(from, z.path);

/** The zone whose road stretch is closest to `from`, or null when the list is empty. */
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
 * Fixture list — Carmarthenshire, taken from the design handoff and kept for
 * tests and for offline first-run.
 *
 * ⚠️ The geometry is APPROXIMATE. The published source describes sites in prose
 * ('A484 Llangain to Bancyfelin'); resolving that to real road segments is a
 * server-side geocode that has to be reviewed by hand before it ships. Treat
 * these paths as placeholders good enough to exercise the UI, not as data to
 * warn a driver with.
 */
export const fixtureZones: Zone[] = [
  {
    id: 'z1',
    road: 'A484',
    name: 'Llangain → Bancyfelin',
    window: { from: '08:00', to: '13:00' },
    limitMph: 60,
    note: 'Published this morning at 06:12 for today only.',
    lastPublished: today(0),
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
    window: { from: '07:00', to: '19:00' },
    limitMph: 50,
    note: 'Listed every weekday for the last three weeks.',
    lastPublished: today(0),
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
    window: { from: '06:00', to: '14:00' },
    limitMph: 70,
    note: 'Dual carriageway stretch; zone covers the eastbound side only.',
    lastPublished: today(0),
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
    window: { from: '10:00', to: '18:00' },
    limitMph: 30,
    note: 'Scheduled for later today — not yet in its published window.',
    lastPublished: today(0),
    path: [
      { latitude: 51.793, longitude: -3.986 },
      { latitude: 51.7975, longitude: -3.979 },
    ],
  },
  {
    id: 'z5',
    road: 'A4069',
    name: 'Llandeilo, Ffairfach',
    window: { from: '12:00', to: '20:00' },
    limitMph: 40,
    note: 'Scheduled for later today — not yet in its published window.',
    lastPublished: today(0),
    path: [
      { latitude: 51.876, longitude: -3.997 },
      { latitude: 51.87, longitude: -3.993 },
    ],
  },
  {
    id: 'z6',
    road: 'B4300',
    name: 'Golden Grove',
    window: null,
    limitMph: 60,
    note: 'Kept visible because you have stale zones switched on.',
    lastPublished: today(-8),
    path: [
      { latitude: 51.858, longitude: -4.056 },
      { latitude: 51.853, longitude: -4.033 },
    ],
  },
];

/** ISO date `offsetDays` from today, so the fixture ages correctly whenever it runs. */
function today(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
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
