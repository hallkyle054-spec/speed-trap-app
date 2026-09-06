import { Theme } from '../state/settingsSchema';

/**
 * Which palette the widget draws in.
 *
 * The app's Appearance setting is what the driver chose, so the widget honours
 * it rather than asking the system directly. `system` is resolved at render
 * time, not at write time: the phone can switch to dark hours after the app was
 * last open, and the widget should follow it there.
 */
export const widgetIsDark = (theme: Theme | null | undefined, systemIsDark: boolean): boolean =>
  theme === 'dark' || ((theme == null || theme === 'system') && systemIsDark);
