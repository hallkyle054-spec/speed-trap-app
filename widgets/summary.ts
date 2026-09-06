import AsyncStorage from '@react-native-async-storage/async-storage';

import { Theme } from '../state/settingsSchema';

/**
 * The small amount of state the cover-screen widget shows.
 *
 * The widget runs headless, in its own JS context, with no access to the app's
 * providers and no location of its own. So the app writes what it knows here
 * whenever it changes, and the widget renders that with the time it was true —
 * it reports a last-known state honestly rather than implying it is live.
 */

const KEY = 'verge.widget.summary.v1';

export type WidgetSummary = {
  /** Zones on the list the app is carrying. */
  zoneCount: number;
  /** The date of that list, 'YYYY-MM-DD'. */
  listedOn: string | null;
  /** Nearest zone, when the app has had a position. */
  nearestLabel: string | null;
  /** Metres to it. */
  nearestMetres: number | null;
  /** Its posted limit in mph, when the list gives one. */
  nearestLimitMph: number | null;
  /**
   * Nearby zones as metres east and north of the driver, for the locality the
   * widget draws. Offsets rather than coordinates: the widget only ever shows
   * them relative to the centre, and offsets cannot be mistaken for a position.
   */
  nearby: { east: number; north: number }[];
  /** The app's Appearance setting, so the widget draws in the chosen palette. */
  theme: Theme;
  /** When this was written, as an ISO timestamp. */
  at: string;
  /** False when the position was the fallback origin rather than a real fix. */
  fromRealFix: boolean;
};

export async function writeSummary(summary: WidgetSummary): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(summary));
  } catch {
    /* the widget simply shows its last good state */
  }
}

export async function readSummary(): Promise<WidgetSummary | null> {
  try {
    const json = await AsyncStorage.getItem(KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<WidgetSummary>;
    if (typeof parsed?.zoneCount !== 'number' || typeof parsed.at !== 'string') return null;
    return {
      zoneCount: parsed.zoneCount,
      listedOn: typeof parsed.listedOn === 'string' ? parsed.listedOn : null,
      nearestLabel: typeof parsed.nearestLabel === 'string' ? parsed.nearestLabel : null,
      nearestMetres: typeof parsed.nearestMetres === 'number' ? parsed.nearestMetres : null,
      nearestLimitMph:
        typeof parsed.nearestLimitMph === 'number' ? parsed.nearestLimitMph : null,
      nearby: Array.isArray(parsed.nearby)
        ? parsed.nearby.filter(
            (n): n is { east: number; north: number } =>
              typeof n?.east === 'number' && typeof n?.north === 'number',
          )
        : [],
      theme:
        parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
          ? parsed.theme
          : 'system',
      at: parsed.at,
      fromRealFix: parsed.fromRealFix === true,
    };
  } catch {
    return null;
  }
}
