/**
 * Police forces, over the counties the publisher names.
 *
 * The feed carries a unitary authority per zone, which is what the source
 * publishes and what the filter runs on. Twenty-two of them is a long list to
 * work through when what a driver usually means is "the patch I drive". Wales
 * has four forces, and every authority sits wholly inside one of them — the
 * police areas were drawn onto the 1996 authority boundaries and have not moved
 * since, so this is a grouping over the counties rather than a second, rival
 * idea of where a zone is.
 *
 * The counties stay underneath. Selection is still stored as authority names,
 * so a county the source adds, renames or spells differently still filters
 * correctly; it simply lands in `UNGROUPED` until it is named here.
 */

/** The four Welsh forces, alphabetically — no force leads the list. */
export const FORCES = ['Dyfed-Powys', 'Gwent', 'North Wales', 'South Wales'] as const;
export type Force = (typeof FORCES)[number];

/** Where a county the map does not know about is listed. */
export const UNGROUPED = 'Elsewhere';

/**
 * Matched on a normalised stem rather than the exact string, because the
 * publisher shortens some of them — "Blaenau" for Blaenau Gwent, "Merthyr" for
 * Merthyr Tydfil, "Anglesey" for the Isle of Anglesey — and a full name and its
 * short form must not land in different groups.
 */
const STEMS: Record<Force, string[]> = {
  'Dyfed-Powys': ['carmarthen', 'ceredigion', 'pembroke', 'powys'],
  Gwent: ['blaenau', 'caerphilly', 'monmouth', 'newport', 'torfaen'],
  'North Wales': ['anglesey', 'isleofanglesey', 'conwy', 'denbigh', 'flint', 'gwynedd', 'wrexham'],
  'South Wales': [
    'bridgend',
    'cardiff',
    'merthyr',
    'neathporttalbot',
    'rhonddacynontaf',
    'swansea',
    'valeofglamorgan',
    'thevaleofglamorgan',
  ],
};

const key = (name: string): string => name.toLowerCase().replace(/[^a-z]/g, '');

/** The force a county belongs to, or null if the map has not heard of it. */
export const forceFor = (county: string): Force | null => {
  const k = key(county);
  if (!k) return null;
  for (const force of FORCES) {
    // Either direction: the stem may be the shorter of the two ("merthyr"
    // against "merthyrtydfil") or the longer ("isleofanglesey" against a feed
    // that has trimmed it).
    if (STEMS[force].some(stem => k.startsWith(stem) || stem.startsWith(k))) return force;
  }
  return null;
};

export type ForceGroup = { force: Force | typeof UNGROUPED; counties: string[] };

/**
 * Groups the feed's counties by force, dropping a force the feed has nothing
 * in. An empty group would be a row that does nothing, and a driver would
 * reasonably read it as a force with no enforcement rather than as a gap in
 * today's list.
 */
export const groupByForce = (counties: readonly string[]): ForceGroup[] => {
  const groups: ForceGroup[] = FORCES.map(force => ({
    force,
    counties: counties.filter(c => forceFor(c) === force),
  })).filter(g => g.counties.length > 0);

  const rest = counties.filter(c => forceFor(c) === null);
  if (rest.length) groups.push({ force: UNGROUPED, counties: [...rest] });
  return groups;
};

/**
 * What the map is showing, for the kicker above the title.
 *
 * The header used to name one county because the feed only carried one. It
 * carries the country now, so the label has to follow the selection or it
 * states something the map is not doing. A whole force reads as the force; a
 * selection that does not land on force boundaries is counted rather than
 * listed, because a kicker is one line and twelve county names is not one line.
 */
export function coverageLabel(selected: readonly string[], all: readonly string[]): string {
  if (all.length === 0 || selected.length === 0 || selected.length >= all.length) {
    return 'Cymru · Wales';
  }
  if (selected.length === 1) return selected[0];

  const touched = groupByForce(all).filter(g => g.counties.some(c => selected.includes(c)));
  const whole = touched.every(g => g.counties.every(c => selected.includes(c)));
  if (whole && touched.length <= 2) return touched.map(g => g.force).join(' · ');

  return `${selected.length} counties`;
}
