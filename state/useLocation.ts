import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { LatLng } from '../data/geo';
import { FALLBACK_ORIGIN } from '../data/zones';

export type Position = {
  /** Where distances are measured from — the real fix, or the fallback origin. */
  origin: LatLng;
  /** False while the fallback is standing in, so the UI can say so. */
  isReal: boolean;
};

/**
 * Foreground position for the map and the nearest-zone card. Until permission
 * is granted (or if it is refused) distances are measured from the fixture's
 * fallback origin so the screen still reads correctly.
 */
export function useLocation(): Position {
  const [position, setPosition] = useState<Position>({ origin: FALLBACK_ORIGIN, isReal: false });

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync().catch(() => ({
        granted: false,
      }));
      if (!granted || cancelled) return;
      try {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 15_000, distanceInterval: 50 },
          ({ coords }) => {
            if (cancelled) return;
            setPosition({
              origin: { latitude: coords.latitude, longitude: coords.longitude },
              isReal: true,
            });
          },
        );
      } catch {
        /* provider unavailable — the fallback origin stands */
      }
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return position;
}
