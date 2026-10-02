import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as Location from 'expo-location';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';

import { updateAlerts } from '../data/alerts';
import { LatLng, metresPerSecondToMph } from '../data/geo';
import { Zone, distanceTo } from '../data/zones';
import { Settings } from './settings';

/** Where the numbers on the HUD are coming from. */
export type DriveSource = 'gps' | 'simulated';

export type DriveState = {
  /** The site being approached — it follows the drive rather than being fixed. */
  zone: Zone | null;
  /** Metres to it. */
  distance: number;
  speedMph: number;
  chiming: boolean;
  source: DriveSource;
  /** The latest fix, so the HUD's map can follow the drive. Null until one arrives. */
  position: LatLng | null;
  start: (zone: Zone) => void;
  end: () => void;
};

/**
 * The prototype's simulated approach, kept for when location permission is
 * refused or no fix has arrived: distance starts at 1600 m and drops 34 m every
 * 150 ms; speed reads 58 then 56 under 900 m; it stops at 0.
 */
const SIM = { from: 1600, step: 34, everyMs: 150, fastMph: 58, slowMph: 56, slowUnder: 900 };

/** How long the chime banner stays up after the tone. */
const CHIME_BANNER_MS = 6000;

export function useDrive(
  settings: Settings,
  zones: readonly Zone[],
  origin: LatLng,
): DriveState {
  const [zone, setZone] = useState<Zone | null>(null);
  const [distance, setDistance] = useState(SIM.from);
  const [speedMph, setSpeedMph] = useState(SIM.fastMph);
  const [source, setSource] = useState<DriveSource>('simulated');
  const [chiming, setChiming] = useState(false);
  const [position, setPosition] = useState<LatLng | null>(null);

  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const banner = useRef<ReturnType<typeof setTimeout> | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);
  const simDistance = useRef(SIM.from);
  /**
   * Which drive a late `await` belongs to. Starting a drive bumps it, so a
   * permission prompt or a location call that resolves after the driver has
   * already stopped — or started a different drive — knows to drop its result
   * rather than write it over the current one.
   */
  const generation = useRef(0);
  /** Sites already chimed for on this drive; they re-arm once well clear. */
  const alerted = useRef<Set<string>>(new Set());

  const player = useAudioPlayer(require('../assets/chime.wav'));

  useEffect(() => {
    // Duck other audio rather than stopping it — the driver may be on a call.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }, []);

  const stopEverything = useCallback(() => {
    generation.current += 1;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    if (banner.current) clearTimeout(banner.current);
    banner.current = null;
    watcher.current?.remove();
    watcher.current = null;
    Speech.stop();
  }, []);

  useEffect(() => stopEverything, [stopEverything]);

  /**
   * One soft tone as a site comes inside the warn distance. It fires whatever
   * the driver's speed — going carefully past a published site is exactly when
   * a warning is wanted, so nothing suppresses it.
   */
  const chime = useCallback(
    (target: Zone) => {
      if (settings.chime) {
        setChiming(true);
        player.seekTo(0).then(() => player.play()).catch(() => player.play());
        if (banner.current) clearTimeout(banner.current);
        banner.current = setTimeout(() => setChiming(false), CHIME_BANNER_MS);
      }
      if (settings.voice) {
        const where = target.name ? `${target.road}, ${target.name}` : target.road;
        Speech.speak(`Published zone in ${settings.warnAt} metres. ${where}`, { rate: 0.95 });
      }
    },
    [player, settings.chime, settings.voice, settings.warnAt],
  );

  // The watcher and the countdown capture their callbacks when they start;
  // going through refs keeps a setting changed mid-drive live.
  const chimeRef = useRef(chime);
  const settingsRef = useRef(settings);
  const zonesRef = useRef(zones);
  const originRef = useRef(origin);
  useEffect(() => {
    chimeRef.current = chime;
    settingsRef.current = settings;
    zonesRef.current = zones;
    originRef.current = origin;
  }, [chime, settings, zones, origin]);

  const runSimulation = useCallback((target: Zone) => {
    setSource('simulated');
    simDistance.current = SIM.from;
    setDistance(SIM.from);
    setSpeedMph(SIM.fastMph);
    setZone(target);

    timer.current = setInterval(() => {
      // Deliberately not inside a state updater — React may run those twice,
      // which would fire the chime twice.
      const next = Math.max(0, simDistance.current - SIM.step);
      simDistance.current = next;
      setDistance(next);
      setSpeedMph(next < SIM.slowUnder ? SIM.slowMph : SIM.fastMph);

      if (next <= settingsRef.current.warnAt && !alerted.current.has(target.id)) {
        alerted.current.add(target.id);
        chimeRef.current(target);
      }
      if (next <= 0 && timer.current) {
        clearInterval(timer.current);
        timer.current = null;
      }
    }, SIM.everyMs);
  }, []);

  const start = useCallback(
    (target: Zone) => {
      stopEverything();
      const mine = generation.current;
      alerted.current = new Set();
      setChiming(false);
      setZone(target);
      setPosition(null);
      // Seeded from the last known fix below, so the cover screen is not left
      // without a position for the seconds a cold GPS lock takes.
      // Measured from where the driver actually is. This used to measure the
      // zone against its own first point — always zero — so the HUD opened
      // announcing "Now · Zone begins" before a single fix had arrived.
      setDistance(distanceTo(target, originRef.current));

      (async () => {
        const { granted } = await Location.requestForegroundPermissionsAsync().catch(() => ({
          granted: false,
        }));
        if (generation.current !== mine) return;
        if (!granted) {
          runSimulation(target);
          return;
        }
        // A cold lock at BestForNavigation can take tens of seconds, and until
        // the first fix lands `position` is null — which on the cover screen
        // greys out recentre and hides the route button entirely. The last
        // known fix is a worse position than the next real one and a far better
        // one than none, so it stands in until the watcher speaks.
        try {
          const last = await Location.getLastKnownPositionAsync({ maxAge: 120_000 });
          if (last && generation.current === mine) {
            setPosition({
              latitude: last.coords.latitude,
              longitude: last.coords.longitude,
            });
          }
        } catch {
          /* no cached fix — the watcher below is the only source */
        }

        try {
          const subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.BestForNavigation,
              // Twice a second, and no distance floor: on the cover screen the
              // map is the whole display, and a position that lurches once a
              // second reads as broken. Only ever while a drive is running.
              timeInterval: 500,
              distanceInterval: 0,
            },
            position => {
              setSource('gps');
              setPosition({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });

              const raw = position.coords.speed;
              setSpeedMph(metresPerSecondToMph(raw != null && raw > 0 ? raw : 0));

              // Follow whatever is actually being approached, not only the site
              // tapped before setting off.
              const update = updateAlerts({
                zones: zonesRef.current,
                origin: position.coords,
                warnAt: settingsRef.current.warnAt,
                alerted: alerted.current,
              });
              alerted.current = update.alerted;

              if (update.nearest) {
                setZone(update.nearest);
                setDistance(update.distance);
              }
              for (const z of update.toChime) chimeRef.current(z);
            },
          );
          // The drive may have ended while the subscription was being set up.
          if (generation.current !== mine) subscription.remove();
          else watcher.current = subscription;
        } catch {
          if (generation.current !== mine) return;
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
    setPosition(null);
  }, [stopEverything]);

  return { zone, distance, speedMph, chiming, source, position, start, end };
}
