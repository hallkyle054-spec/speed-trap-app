import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { distanceToPath, metresPerSecondToMph } from '../data/geo';
import { Zone } from '../data/zones';
import { Settings } from './settings';

/** Where the numbers on the HUD are coming from. */
export type DriveSource = 'gps' | 'simulated';

export type DriveState = {
  zone: Zone | null;
  /** Metres to the start of the zone. */
  distance: number;
  speedMph: number;
  chiming: boolean;
  source: DriveSource;
  start: (zone: Zone) => void;
  end: () => void;
};

/**
 * The prototype's simulated approach, kept as the fallback for when location
 * permission is refused or the provider has not produced a fix yet: distance
 * starts at 1600 m and decrements 34 m every 150 ms; own speed reads 58 and
 * drops to 56 under 900 m; the countdown stops at 0.
 */
const SIM = { from: 1600, step: 34, everyMs: 150, fastMph: 58, slowMph: 56, slowUnder: 900 };

/** How long the chime banner stays up after the tone fires. */
const CHIME_BANNER_MS = 6000;

export function useDrive(settings: Settings): DriveState {
  const [zone, setZone] = useState<Zone | null>(null);
  const [distance, setDistance] = useState(SIM.from);
  const [speedMph, setSpeedMph] = useState(SIM.fastMph);
  const [source, setSource] = useState<DriveSource>('simulated');
  const [chiming, setChiming] = useState(false);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  /** The simulation's own countdown, kept out of state so the tick stays pure. */
  const simDistance = useRef(SIM.from);
  const banner = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  /** One soft tone per drive, not a repeating alarm. */
  const alerted = useRef(false);

  const player = useAudioPlayer(require('../assets/chime.wav'));

  useEffect(() => {
    // Duck other audio rather than stopping it — the driver may be on a call.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }, []);

  const stopEverything = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (banner.current) clearTimeout(banner.current);
    banner.current = null;
    watcher.current?.remove();
    watcher.current = null;
    Speech.stop();
    deactivateKeepAwake().catch(() => {});
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  const alert = useCallback(
    (metres: number) => {
      if (settings.chime) {
        setChiming(true);
        player.seekTo(0).then(() => player.play()).catch(() => player.play());
        if (banner.current) clearTimeout(banner.current);
        banner.current = setTimeout(() => setChiming(false), CHIME_BANNER_MS);
      }
      if (settings.voice) {
        Speech.speak(`Published zone in ${Math.round(metres)} metres`, { rate: 0.95 });
      }
    },
    [player, settings.chime, settings.voice],
  );

  /**
   * Fires once, at or inside the warn distance. `Only when over the limit`
   * keeps it quiet while the driver is already under.
   */
  const maybeAlert = useCallback(
    (metres: number, mph: number, target: Zone) => {
      if (alerted.current || metres > settings.warnAt) return;
      // With no published limit there is nothing to be under, so the alert
      // stands rather than being silently suppressed.
      if (settings.onlyOverLimit && target.limitMph != null && mph <= target.limitMph) return;
      alerted.current = true;
      alert(settings.warnAt);
    },
    [alert, settings.onlyOverLimit, settings.warnAt],
  );

  /**
   * The countdown and the location watcher both capture their callback when
   * they start; routing through a ref keeps a setting changed mid-drive live.
   */
  const maybeAlertRef = useRef(maybeAlert);
  useEffect(() => {
    maybeAlertRef.current = maybeAlert;
  }, [maybeAlert]);

  const runSimulation = useCallback(
    (target: Zone) => {
      setSource('simulated');
      simDistance.current = SIM.from;
      setDistance(SIM.from);
      setSpeedMph(SIM.fastMph);
      timer.current = setInterval(() => {
        // Deliberately not inside a state updater — React may run those twice,
        // which would fire the chime twice.
        const next = Math.max(0, simDistance.current - SIM.step);
        simDistance.current = next;
        const mph = next < SIM.slowUnder ? SIM.slowMph : SIM.fastMph;
        setDistance(next);
        setSpeedMph(mph);
        maybeAlertRef.current(next, mph, target);
        if (next <= 0 && timer.current) {
          clearInterval(timer.current);
          timer.current = null;
        }
      }, SIM.everyMs);
    },
    [],
  );

  const start = useCallback(
    (target: Zone) => {
      stopEverything();
      alerted.current = false;
      setChiming(false);
      setZone(target);
      activateKeepAwakeAsync('verge-drive').catch(() => {});

      (async () => {
        const { granted } = await Location.requestForegroundPermissionsAsync().catch(() => ({
          granted: false,
        }));
        if (!granted) {
          runSimulation(target);
          return;
        }
        try {
          watcher.current = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              timeInterval: 1000,
              distanceInterval: 5,
            },
            position => {
              setSource('gps');
              const metres = distanceToPath(position.coords, target.path);
              const raw = position.coords.speed;
              const mph = metresPerSecondToMph(raw != null && raw > 0 ? raw : 0);
              setDistance(metres);
              setSpeedMph(mph);
              maybeAlertRef.current(metres, mph, target);
            },
          );
        } catch {
          // Provider unavailable — fall back rather than showing a dead HUD.
          runSimulation(target);
        }
      })();
    },
    [runSimulation, stopEverything],
  );

  const end = useCallback(() => {
    stopEverything();
    setChiming(false);
    setZone(null);
  }, [stopEverything]);

  return { zone, distance, speedMph, chiming, source, start, end };
}
