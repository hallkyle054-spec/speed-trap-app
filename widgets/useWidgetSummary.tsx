import React, { useEffect, useRef } from 'react';
import { Appearance, Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { VergeWidget } from './VergeWidget';
import { COMPACT_UNDER_DP, WIDGET_NAME } from './names';

import { LatLng } from '../data/geo';
import { Zone, distanceTo, nearestZone, zoneTitle } from '../data/zones';
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

export function useWidgetSummary({
  zones,
  listedOn,
  origin,
  originIsReal,
}: {
  zones: Zone[];
  listedOn: string | null;
  origin: LatLng;
  originIsReal: boolean;
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

    const summary = {
      zoneCount: zones.length,
      listedOn,
      nearestLabel: nearest ? zoneTitle(nearest) : null,
      nearestMetres: metres,
      at: new Date().toISOString(),
      fromRealFix: originIsReal,
    };

    void writeSummary(summary).then(() => {
      if (Platform.OS !== 'android') return;
      const isDark = Appearance.getColorScheme() === 'dark';
      // Best effort: with no widget placed this is simply a no-op. Each placed
      // widget reports its own size, so a 2x1 on a cover screen and a 2x2 on
      // the home screen get the layout each has room for.
      requestWidgetUpdate({
        widgetName: WIDGET_NAME,
        renderWidget: info => (
          <VergeWidget
            summary={summary}
            isDark={isDark}
            variant={info.height < COMPACT_UNDER_DP ? 'compact' : 'tile'}
          />
        ),
      });
    });
  }, [zones, listedOn, origin, originIsReal]);
}
