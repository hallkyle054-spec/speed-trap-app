/**
 * The widget's name, which is also the generated AppWidgetProvider class name.
 * It is referenced from app.config.ts, the config plugin and the runtime, so it
 * lives in one place — a mismatch shows up only as a widget that silently never
 * redraws.
 */
export const WIDGET_NAME = 'Verge';

/**
 * Below this height the widget is a 2x1 strip and has room for one line, not
 * three. Android reports the size it actually gave us on every redraw, so the
 * layout is chosen from that rather than from a size we declared and hoped for.
 */
export const COMPACT_UNDER_DP = 90;
