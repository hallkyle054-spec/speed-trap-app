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
