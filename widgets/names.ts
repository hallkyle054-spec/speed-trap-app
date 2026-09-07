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
 * How large the distance can be set: the smaller of what the width allows and
 * what the height can spare.
 *
 * Width, because Cormorant sets a string like "12.4 km" at roughly 3.4dp per
 * point and it must not wrap — measured off a real cover screen. Height,
 * because everything under it needs room too, and a number that fits across
 * but eats the panel pushes the diagram out of the bottom. Derived rather than
 * fixed: the same layout serves a cover panel and a large home-screen widget,
 * and a size chosen for one looks wrong on the other.
 */
export const panelHeadlineSize = (widthDp: number, heightDp: number): number =>
  Math.max(28, Math.min(76, Math.round(Math.min(widthDp * 0.28, heightDp * 0.2))));

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
  widthDp: number,
  paddingDp: number,
): { inner: number; caption: number; diagram: number } {
  const inner = Math.max(0, widthDp - paddingDp * 2);
  const diagram = Math.max(72, Math.min(120, Math.round(inner * 0.3)));
  return { inner, caption: Math.max(0, inner - PANEL_GAP - diagram), diagram };
}
