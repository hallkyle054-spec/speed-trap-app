/**
 * The widget's name, which is also the generated AppWidgetProvider class name.
 * It is referenced from app.config.ts, the config plugin and the runtime, so it
 * lives in one place — a mismatch shows up only as a widget that silently never
 * redraws.
 */
export const WIDGET_NAME = 'Verge';

/**
 * Android reports the size it actually gave the widget on every redraw, so the
 * layout is chosen from that rather than from the size the manifest asked for.
 * One declaration has to survive a full cover-screen panel, a home-screen tile
 * and a strip the user has dragged down to one row.
 */
export type WidgetVariant = 'compact' | 'tile' | 'cover';

const COMPACT_UNDER_DP = 90;
const COVER_FROM_DP = 200;

export const variantForHeight = (heightDp: number): WidgetVariant =>
  heightDp < COMPACT_UNDER_DP ? 'compact' : heightDp < COVER_FROM_DP ? 'tile' : 'cover';

/** Space between the reading and the diagram beside it. */
export const PANEL_GAP = 14;

/**
 * How much of the reported size hangs off the far edge and is never shown.
 *
 * Android reports the cell the host allocated. The bitmap is painted at that
 * size and then drawn from the top left, so whatever exceeds the view is simply
 * missing — no clipping, no scaling, no error. On a Flip's cover screen the
 * card measures 803px while the reported size implies 856px at 2.625 px/dp:
 * twenty density-independent pixels that exist in the drawing and nowhere on
 * the screen.
 *
 * It has to be corrected in the **padding** as well as in computed widths: a
 * child asking for `match_parent` sizes itself against the padded bitmap, so no
 * arithmetic the layout does can reach it.
 *
 * The number is solved from a build whose code was known, rather than guessed
 * from a screenshot whose build was not — which is how it came out less than
 * half its real size twice. On a Flip's cover screen, running the panel with
 * 22dp of left padding and a hairline set to `reported - 64`:
 *
 *     left padding   22dp measured as  57px   ->  2.59 px/dp
 *     hairline      746px             = 288dp ->  reported = 352dp
 *     card          803px             = 310dp ->  overhang =  42dp
 *
 * Forty-four, for a margin.
 */
export const HOST_OVERHANG = 44;

/** The part of a reported dimension that actually reaches the screen. */
export const drawable = (reportedDp: number): number =>
  Math.max(0, reportedDp - HOST_OVERHANG);

/**
 * Padding for the panel: ordinary on the near edges, plus the overhang on the
 * far ones, so `match_parent` children stop where the card does.
 */
export const panelPadding = (padDp: number, padYDp: number) => ({
  paddingLeft: padDp,
  paddingRight: padDp + HOST_OVERHANG,
  paddingTop: padYDp,
  paddingBottom: padYDp + HOST_OVERHANG,
});

/**
 * How large the distance can be set: the smaller of what the width allows and
 * what the height can spare.
 *
 * Width, because the face sets a string like "12.4 km" at roughly 3.75dp per
 * point and it must not wrap — measured, not assumed: IBM Plex is nearly a
 * third wider than the serif this replaced, so a factor calibrated for that one
 * would have wrapped the distance on the first build. Height,
 * because everything under it needs room too, and a number that fits across
 * but eats the panel pushes the diagram out of the bottom. Derived rather than
 * fixed: the same layout serves a cover panel and a large home-screen widget,
 * and a size chosen for one looks wrong on the other.
 */
export const panelHeadlineSize = (widthDp: number, heightDp: number): number =>
  Math.max(
    28,
    Math.min(76, Math.round(Math.min(widthDp * 0.25, drawable(heightDp) * 0.2))),
  );

/**
 * How the panel's bottom band divides between the diagram and its caption.
 *
 * The toolkit has no flex weights — a row lays its children out at whatever
 * width they ask for, and the first child asking for more than there is pushes
 * the rest off the edge. That is how the diagram left the widget entirely once:
 * an unconstrained road name beside it took the lot. So both get a width.
 *
 * The reading itself no longer shares a row with anything. It runs the full
 * width of the panel, which is what lets the distance be set large and a road
 * name like "Model Church in Wales School" sit on one line.
 */
export function panelBand(
  reportedWidthDp: number,
  paddingDp: number,
): { inner: number; caption: number; diagram: number } {
  // Matches the padding above: one ordinary pad each side, and the overhang.
  const inner = Math.max(0, drawable(reportedWidthDp) - paddingDp * 2);
  const diagram = Math.max(72, Math.min(120, Math.round(inner * 0.3)));
  return { inner, caption: Math.max(0, inner - PANEL_GAP - diagram), diagram };
}
