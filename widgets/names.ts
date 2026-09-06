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
