import { LatLng, distanceToPath, haversine } from './geo';

/**
 * Deciding when a missed turn is a missed turn.
 *
 * A route is a line, and a driver who has left it has either missed a turn or
 * taken a better way. Either way the purple line is now wrong, so it is worth
 * asking for a new one — but not instantly, and not repeatedly.
 *
 * Three things keep it honest. A single stray fix means nothing: GPS wanders,
 * and a parallel carriageway or a bridge over the route reads as off-route for
 * a second. A reroute costs a billed request, so there is a floor on how often
 * one can be asked for. And a driver about to arrive is not lost, so the last
 * stretch does not trigger one at all — overshooting the destination by a
 * street is not a navigation failure worth redrawing the map for.
 */

/** How far off the line counts as off it. Wider than GPS noise, tighter than a wrong turn. */
export const OFF_ROUTE_M = 60;
/** Consecutive stray fixes before believing it. At twice a second this is three seconds. */
export const OFF_ROUTE_FIXES = 6;
/** No more than one reroute in this window, however lost the driver gets. */
export const REROUTE_GAP_MS = 20_000;
/** Inside this of the destination, nothing is a missed turn any more. */
export const ARRIVED_M = 150;

export type OffRouteInput = {
  position: LatLng;
  path: readonly LatLng[];
  destination: LatLng;
  /** Stray fixes counted so far, from the previous call's result. */
  strayFixes: number;
  /** When the last reroute was asked for; 0 if none yet. */
  lastRerouteAt: number;
  now: number;
};

export type OffRouteResult = {
  /** Carry this into the next call. */
  strayFixes: number;
  /** True exactly once per departure, on the fix that confirms it. */
  reroute: boolean;
};

export function trackOffRoute({
  position,
  path,
  destination,
  strayFixes,
  lastRerouteAt,
  now,
}: OffRouteInput): OffRouteResult {
  // No line to be off, or near enough to the end that being off it is moot.
  if (path.length < 2 || haversine(position, destination) <= ARRIVED_M) {
    return { strayFixes: 0, reroute: false };
  }

  if (distanceToPath(position, path) <= OFF_ROUTE_M) return { strayFixes: 0, reroute: false };

  const next = strayFixes + 1;
  // Fires on the fix that reaches the threshold and not on the ones after it,
  // so one departure asks for one route rather than one per fix until it lands.
  if (next !== OFF_ROUTE_FIXES) return { strayFixes: next, reroute: false };
  if (lastRerouteAt && now - lastRerouteAt < REROUTE_GAP_MS) {
    // Too soon. Hold the count below the threshold so it can fire again once
    // the window passes, rather than latching off for the rest of the drive.
    return { strayFixes: next - 1, reroute: false };
  }
  return { strayFixes: next, reroute: true };
}
