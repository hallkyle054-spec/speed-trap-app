/**
 * When the widget's stored summary is worth rewriting.
 *
 * Most of what the widget shows moves with the driver, and a fix arrives every
 * second, so position-driven writes are throttled — redrawing a widget that
 * often would be wasteful at the precision it shows.
 *
 * Everything else must not be throttled. A setting the driver just changed, or
 * a list that just refreshed, has to reach the widget now: waiting a minute for
 * a distance threshold nobody crossed makes the widget look broken. That was a
 * real bug — changing the app's Appearance left the widget in the old palette
 * until the driver happened to move a hundred metres.
 */

export type RefreshState = {
  /** When the last write happened, epoch ms. */
  at: number;
  /** Metres to the nearest zone at that write, or null with no fix. */
  metres: number | null;
  /** Everything about the summary that is not positional, as one string. */
  signature: string;
};

export function shouldRefresh({
  last,
  now,
  metres,
  signature,
  minIntervalMs,
  minMoveM,
}: {
  last: RefreshState | null;
  now: number;
  metres: number | null;
  signature: string;
  minIntervalMs: number;
  minMoveM: number;
}): boolean {
  if (!last) return true;
  if (last.signature !== signature) return true;
  if (now - last.at >= minIntervalMs) return true;
  if (last.metres == null || metres == null) return true;
  return Math.abs(metres - last.metres) >= minMoveM;
}
