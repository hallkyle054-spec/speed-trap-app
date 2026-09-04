import { LatLng } from './geo';
import { Zone, distanceTo } from './zones';

/**
 * Which sites to chime for, as pure logic so it can be tested away from GPS.
 *
 * The driver is warned about whatever they are actually approaching, not only
 * the site they tapped before setting off — with dozens of sites in the county
 * a single chime per journey would be close to useless.
 */

/**
 * A site re-arms once you are half again beyond the warn distance. Without the
 * gap, sitting near the threshold in traffic would chime over and over.
 */
export const REARM_FACTOR = 1.5;

export type AlertUpdate = {
  /** The site the HUD should be showing — the closest one. */
  nearest: Zone | null;
  /** Metres to it. */
  distance: number;
  /** Sites that have just come inside the warn distance and have not chimed. */
  toChime: Zone[];
  /** The new set of sites considered already-chimed. */
  alerted: Set<string>;
};

export function updateAlerts({
  zones,
  origin,
  warnAt,
  alerted,
}: {
  zones: readonly Zone[];
  origin: LatLng;
  warnAt: number;
  alerted: ReadonlySet<string>;
}): AlertUpdate {
  const next = new Set(alerted);
  const toChime: Zone[] = [];

  let nearest: Zone | null = null;
  let distance = Number.POSITIVE_INFINITY;

  for (const zone of zones) {
    const d = distanceTo(zone, origin);

    if (d < distance) {
      distance = d;
      nearest = zone;
    }

    if (d <= warnAt) {
      if (!next.has(zone.id)) {
        next.add(zone.id);
        toChime.push(zone);
      }
    } else if (d > warnAt * REARM_FACTOR) {
      // Well clear of it now; chime again if it is approached later.
      next.delete(zone.id);
    }
  }

  return { nearest, distance, toChime, alerted: next };
}
