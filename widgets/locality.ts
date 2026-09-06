/**
 * The locality diagram: where the published zones sit around the driver.
 *
 * Not a street map. An Android widget draws a static image, so a real map
 * would be a photograph of somewhere you were rather than somewhere you are —
 * and a photograph of a map reads as live in a way a diagram does not. This
 * draws only what the app already knows and can state honestly: your position
 * at the centre, the zones around it, and the scale of the ground shown.
 *
 * Returned as an SVG string, which is what the widget toolkit renders.
 */

export type Offset = { east: number; north: number };

export type LocalityColours = {
  /** The zone marks. */
  mark: string;
  /** Range rings and the scale ring. */
  ring: string;
  /** The driver at the centre. */
  ink: string;
};

/** Drawn on a square this many units across; the widget scales it to fit. */
const SIZE = 120;
const CENTRE = SIZE / 2;
/** Leaves room for a mark drawn on the outermost ring without clipping it. */
const EDGE = CENTRE - 8;
/** Nothing useful is conveyed by a locality tighter than this. */
const MIN_RADIUS_M = 800;
const MAX_RADIUS_M = 8_000;

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * How much ground the diagram covers, in metres from the centre to the edge.
 * Chosen so the furthest mark sits inside the edge rather than on it.
 */
export function localityRadius(nearby: readonly Offset[]): number {
  const furthest = nearby.reduce(
    (max, o) => Math.max(max, Math.hypot(o.east, o.north)),
    0,
  );
  return Math.min(MAX_RADIUS_M, Math.max(MIN_RADIUS_M, furthest * 1.15));
}

/** '2 km' / '800 m' — the radius, for the caption beside the diagram. */
export function localityScale(radiusM: number): string {
  return radiusM >= 1000 ? `${round(radiusM / 1000)} km` : `${Math.round(radiusM / 50) * 50} m`;
}

export function localitySvg(nearby: readonly Offset[], colours: LocalityColours): string {
  const radiusM = localityRadius(nearby);
  const perMetre = EDGE / radiusM;

  // North is up, so a positive northing moves toward the top of the image.
  const marks = nearby
    .map(o => ({ x: CENTRE + o.east * perMetre, y: CENTRE - o.north * perMetre }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map(p => `<circle cx="${round(p.x)}" cy="${round(p.y)}" r="3.1" fill="${colours.mark}"/>`)
    .join('');

  // Two rings: half the ground shown, and all of it. Enough to read a distance
  // off the picture without turning it into graph paper.
  const rings = [EDGE / 2, EDGE]
    .map(
      r =>
        `<circle cx="${CENTRE}" cy="${CENTRE}" r="${round(r)}" fill="none" ` +
        `stroke="${colours.ring}" stroke-width="0.8" stroke-dasharray="2 3"/>`,
    )
    .join('');

  // The driver: the same ring-and-dot the cover screen's recentre bubble uses.
  const you =
    `<circle cx="${CENTRE}" cy="${CENTRE}" r="5" fill="none" ` +
    `stroke="${colours.ink}" stroke-width="1.6"/>` +
    `<circle cx="${CENTRE}" cy="${CENTRE}" r="1.9" fill="${colours.ink}"/>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" ` +
    `width="${SIZE}" height="${SIZE}">${rings}${marks}${you}</svg>`
  );
}
