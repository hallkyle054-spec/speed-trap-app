import { Zone } from './zones';

/**
 * Counties, as the publisher names them.
 *
 * The feed carries the whole of Wales, which is more than most drivers want
 * plotted. The list offered is built from what the feed actually contains
 * rather than from a hardcoded roll of Welsh authorities — a county the source
 * stops publishing should leave the list, and one it starts publishing should
 * arrive, without anyone editing an array here.
 */

export const countiesIn = (zones: readonly Zone[]): string[] =>
  [...new Set(zones.map(z => z.authority).filter((a): a is string => !!a))].sort();

/**
 * Whether a zone survives the county filter.
 *
 * An empty selection means everywhere — the default, and what a driver who has
 * never opened the list should get. A zone with no authority always survives:
 * feeds built before that field existed are still good data, and dropping them
 * would empty the map for anyone who had chosen a county.
 */
export const inSelectedCounties = (zone: Zone, selected: readonly string[]): boolean =>
  selected.length === 0 || !zone.authority || selected.includes(zone.authority);

/**
 * Turns a county — or a whole force's worth of them — on or off, returning the
 * value to store.
 *
 * Two rules make the stored value behave. The first tap has to expand
 * "everywhere" into a real list, or unticking one county would read as
 * unticking all of them. And a list that has grown back to every county
 * collapses to empty again, so a county the source starts publishing later
 * still arrives on its own rather than being silently excluded by a list
 * written before it existed.
 *
 * The last county on cannot be turned off. There is no way to store "none" —
 * empty already means everywhere — and an app filtered down to nothing would be
 * an app that does nothing, so the request is declined rather than quietly
 * inverted into showing the whole country.
 */
export function setCounties(
  selected: readonly string[],
  all: readonly string[],
  changing: readonly string[],
  on: boolean,
): string[] {
  const current = new Set(selected.length === 0 ? all : selected);
  for (const county of changing) {
    if (on) current.add(county);
    else current.delete(county);
  }
  // Filtering `all` keeps the feed's own order and drops a county the source no
  // longer carries, so a stale name cannot stop the list ever reaching "all".
  const next = all.filter(c => current.has(c));
  if (next.length === 0) return [...selected];
  return next.length === all.length ? [] : next;
}

/** Whether a county is currently carried. Empty means everywhere. */
export const countyIsOn = (county: string, selected: readonly string[]): boolean =>
  selected.length === 0 || selected.includes(county);
