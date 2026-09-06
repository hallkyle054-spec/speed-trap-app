import React, { useEffect, useRef } from 'react';
import { Appearance, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { VergeWidget } from './VergeWidget';
import { WIDGET_NAME, variantForHeight } from './names';
import { widgetIsDark } from './theme';

import { LatLng, offsetMetres } from '../data/geo';
import { Zone, distanceTo, nearestZone, zoneTitle } from '../data/zones';
import { Theme } from '../state/settingsSchema';
import { writeSummary } from './summary';

/**
 * Writes the widget's summary whenever what the app knows changes, and asks
 * Android to redraw. Throttled: a moving driver produces a fix every second,
 * and a widget redraw per second would be wasteful and pointless at the
 * precision the widget shows.
 */
const MIN_INTERVAL_MS = 60_000;
/** Below this the distance is unchanged as far as the widget is concerned. */
const MIN_MOVE_M = 100;
/** How far out the widget's locality reaches, and how many marks it will draw. */
const LOCALITY_M = 8_000;
const MAX_MARKS = 14;

export function useWidgetSummary({
  zones,
  listedOn,
  origin,
  originIsReal,
  theme,
}: {
  zones: Zone[];
  listedOn: string | null;
  origin: LatLng;
  originIsReal: boolean;
  theme: Theme;
}) {
  const lastWrite = useRef(0);
  const lastMetres = useRef<number | null>(null);

  useEffect(() => {
    const nearest = zones.length ? nearestZone(zones, origin) : null;
    const metres = nearest ? distanceTo(nearest, origin) : null;

    const movedEnough =
      lastMetres.current == null ||
      metres == null ||
      Math.abs(metres - lastMetres.current) >= MIN_MOVE_M;
    const dueAnyway = Date.now() - lastWrite.current >= MIN_INTERVAL_MS;
    if (lastWrite.current && !movedEnough && !dueAnyway) return;

    lastWrite.current = Date.now();
    lastMetres.current = metres;

    // The ground around the driver, as offsets. Nearest first, so the cap
    // drops the far ones rather than whichever happened to be listed last.
    const nearby = originIsReal
      ? zones
          .map(zone => ({ zone, metres: distanceTo(zone, origin) }))
          .filter(z => z.metres <= LOCALITY_M)
          .sort((a, b) => a.metres - b.metres)
          .slice(0, MAX_MARKS)
          .map(z => offsetMetres(origin, z.zone.path[0]))
          .map(o => ({ east: Math.round(o.east), north: Math.round(o.north) }))
      : [];

    const summary = {
      zoneCount: zones.length,
      listedOn,
      nearestLabel: nearest ? zoneTitle(nearest) : null,
      nearestMetres: metres,
      nearestLimitMph: nearest?.limitMph ?? null,
      at: new Date().toISOString(),
      fromRealFix: originIsReal,
      nearby,
      theme,
    };

    void writeSummary(summary).then(() => {
      if (Platform.OS !== 'android') return;
      const isDark = widgetIsDark(theme, Appearance.getColorScheme() === 'dark');
      // Best effort: with no widget placed this is simply a no-op. Each placed
      // widget reports its own size, so a 2x1 on a cover screen and a 2x2 on
      // the home screen get the layout each has room for.
      requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: info => (
          <VergeWidget
            summary={summary}
            isDark={isDark}
            variant={variantForHeight(info.height)}
          />
        ),
      });
    });
  }, [zones, listedOn, origin, originIsReal, theme]);
}
