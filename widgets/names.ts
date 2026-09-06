/**
 * The widget names, which are also the generated AppWidgetProvider class names.
 * They are referenced from app.config.ts, the config plugin and the runtime, so
 * they live in one place — a mismatch shows up only as a widget that silently
 * never redraws.
 */
export const WIDGETS = {
  /** A 2x2 home-screen cell. */
  tile: 'Verge',
  /** Sized for a Flip's Flex Window, and declared to Samsung as a cover widget. */
  cover: 'VergeCover',
} as const;
