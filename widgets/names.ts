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
 * How the panel's width is divided between the reading and the diagram.
 *
 * The toolkit has no flex weights — a row lays its children out at whatever
 * width they ask for, and the first child asking for more than there is pushes
 * the rest off the edge. A road name is exactly that: left unconstrained,
 * "Model Church in Wales School" sets itself on one long line and the diagram
 * leaves the widget entirely. So both columns are given an explicit width and
 * the text wraps inside its own.
 */
/**
 * How large the distance can be set without wrapping in its column.
 *
 * Measured off a real cover screen: Cormorant sets a string like "12.4 km" at
 * roughly 3.4dp of width per point of size, so a third of the column is the
 * ceiling and a little under is the safe number. Derived rather than fixed
 * because the same layout has to serve a cover panel and a large home-screen
 * widget, and a size chosen for one looks wrong on the other.
 */
export const panelHeadlineSize = (readingDp: number): number =>
  Math.max(30, Math.min(72, Math.round(readingDp * 0.28)));

export function panelColumns(
  widthDp: number,
  paddingDp: number,
): { reading: number; diagram: number } {
  const inner = Math.max(0, widthDp - paddingDp * 2);
  const diagram = Math.max(80, Math.min(130, Math.round(inner * 0.32)));
  return { reading: Math.max(0, inner - PANEL_GAP - diagram), diagram };
}
