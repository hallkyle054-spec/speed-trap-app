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
 *
 * This is also what the cover screen falls back to between drives, so it has to
 * be good enough to centre a map on and quick enough to be there when the
 * screen opens. It is not navigation-grade on purpose — a drive starts its own
 * watcher at twice a second, and running that the rest of the time would cost
 * the battery far more than the accuracy is worth while parked.
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

      // A fix already in hand beats waiting for the first callback, which on a
      // cold lock is seconds away. Two minutes old is still a good enough map
      // centre; anything older is left to the watcher.
      try {
        const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
        if (last && !cancelled) {
          setPosition({
            origin: { latitude: last.coords.latitude, longitude: last.coords.longitude },
            isReal: true,
          });
        }
      } catch {
        /* no cached fix — the watcher below is the only source */
      }

      try {
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 4_000, distanceInterval: 20 },
          ({ coords }) => {
            if (cancelled) return;
            setPosition({
              origin: { latitude: coords.latitude, longitude: coords.longitude },
              isReal: true,
            });
          },
        );
        if (cancelled) {
          subscription.remove();
          subscription = null;
        }
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
