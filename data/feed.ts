import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AppState } from 'react-native';

import bundledFeed from '../feed/zones.json';
import { dayLabel } from './dates';
import { LatLng } from './geo';
import { Zone, fixtureZones } from './zones';

/**
 * The body that publishes the list. Every user-facing string that names the
 * source reads it from here — change it in one place.
 *
 * The handoff asked for this to be verified against the real publisher before
 * shipping. For Carmarthenshire that is GoSafe, the Welsh road casualty
 * reduction partnership (gosafe.org.uk), so the brief's name is retained.
 * Confirm the URL and the terms of use before pointing the feed at it.
 */
export const PUBLISHER = 'GoSafe';

/**
 * A clean JSON feed served by our own scheduled job — never the publisher's
 * HTML scraped from the phone. Scraping on-device is brittle, leaks the user's
 * IP to the publisher, and makes offline caching harder.
 *
 * Unset in this repo: the app falls back to the committed fixture so the UI is
 * exercisable, and the ingest job is still to be built.
 */
export const FEED_URL = process.env.EXPO_PUBLIC_ZONE_FEED_URL ?? '';

export type Sync = 'ok' | 'syncing' | 'offline';

const CACHE_KEY = 'verge.feed.v1';
/** The refresh spinner never flashes; the design gives it 1300 ms. */
const MIN_SYNC_MS = 1300;
const REQUEST_TIMEOUT_MS = 12_000;

type Cached = { fetchedAt: string; zones: Zone[] };

const isLatLng = (v: unknown): v is LatLng =>
  !!v &&
  typeof v === 'object' &&
  typeof (v as LatLng).latitude === 'number' &&
  typeof (v as LatLng).longitude === 'number';

/** Drops anything malformed rather than warning a driver with a broken zone. */
export function parseZones(raw: unknown): Zone[] {
  const list = Array.isArray(raw) ? raw : (raw as { zones?: unknown })?.zones;
  if (!Array.isArray(list)) return [];
  return list.filter((z): z is Zone => {
    const c = z as Partial<Zone>;
    return (
      typeof c?.id === 'string' &&
      typeof c.road === 'string' &&
      typeof c.name === 'string' &&
      (c.limitMph === null || typeof c.limitMph === 'number') &&
      typeof c.note === 'string' &&
      typeof c.firstListed === 'string' &&
      (c.sourceUrl == null || typeof c.sourceUrl === 'string') &&
      typeof c.lastListed === 'string' &&
      Array.isArray(c.path) &&
      c.path.length > 0 &&
      c.path.every(isLatLng)
    );
  });
}

/**
 * The real site list, imported from the feed the scheduled ingest commits and
 * shipped inside the app. It is authoritative as of the build, and does not
 * refresh on its own — `bundledListedOn` is what the UI reports so a driver can
 * see how old it is.
 */
export const BUNDLED_ZONES: Zone[] = parseZones(bundledFeed);

export const BUNDLED_LISTED_ON: string | null =
  typeof (bundledFeed as { listedOn?: unknown }).listedOn === 'string'
    ? (bundledFeed as { listedOn: string }).listedOn
    : null;

/**
 * True only when we have fallen all the way back to the invented fixture — no
 * feed URL and no usable bundled list. The UI must say so plainly: a build that
 * quietly shows invented zones is worse than one that shows none.
 */
export const IS_FIXTURE = !FEED_URL && BUNDLED_ZONES.length === 0;

/** How old the built-in list may get before the UI starts complaining. */
export const BUNDLED_STALE_AFTER_DAYS = 7;

async function readCache(): Promise<Cached | null> {
  try {
    const json = await AsyncStorage.getItem(CACHE_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json) as Partial<Cached>;
    const zones = parseZones(parsed?.zones);
    if (!zones.length || typeof parsed.fetchedAt !== 'string') return null;
    return { fetchedAt: parsed.fetchedAt, zones };
  } catch {
    return null;
  }
}

async function writeCache(value: Cached): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(value));
  } catch {
    /* a full or unwritable store must not break the drive */
  }
}

async function fetchFeed(): Promise<Zone[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(FEED_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`feed responded ${res.status}`);
    const zones = parseZones(await res.json());
    if (!zones.length) throw new Error('feed returned no usable zones');
    return zones;
  } finally {
    clearTimeout(timer);
  }
}

export type FeedState = {
  zones: Zone[];
  sync: Sync;
  /** When the list on screen was fetched. Always kept, always surfaced. */
  fetchedAt: Date | null;
  refresh: () => void;
  /** Dev-only affordance for exercising the offline banner. */
  simulateOffline: () => void;
};

/**
 * Always keeps the last good list plus the time it was fetched; the age is what
 * the offline banner reports.
 */
const startingZones = () => (BUNDLED_ZONES.length ? BUNDLED_ZONES : fixtureZones);

const bundledDate = () => {
  if (!BUNDLED_LISTED_ON) return null;
  const [y, m, d] = BUNDLED_LISTED_ON.split('-').map(Number);
  const parsed = new Date(y, (m ?? 1) - 1, d ?? 1);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function useZoneFeed(): FeedState {
  const [zones, setZones] = useState<Zone[]>(startingZones);
  const [sync, setSync] = useState<Sync>('ok');
  const [fetchedAt, setFetchedAt] = useState<Date | null>(bundledDate);
  const inFlight = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSync('syncing');
    const startedAt = Date.now();

    const cached = await readCache();
    if (cached && mounted.current) {
      setZones(cached.zones);
      setFetchedAt(new Date(cached.fetchedAt));
    }

    let next: Zone[] | null = null;
    let failed = false;

    if (FEED_URL) {
      try {
        next = await fetchFeed();
      } catch {
        failed = true;
      }
    } else {
      // No feed URL: the list travels inside the app. Refreshing cannot make it
      // newer, so keep the build's own date rather than stamping it now.
      if (!mounted.current) return;
      inFlight.current = false;
      setZones(startingZones());
      setFetchedAt(bundledDate());
      setSync('ok');
      return;
    }

    const wait = Math.max(0, MIN_SYNC_MS - (Date.now() - startedAt));
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    inFlight.current = false;
    if (!mounted.current) return;

    if (next) {
      const stamp = new Date();
      setZones(next);
      setFetchedAt(stamp);
      setSync('ok');
      void writeCache({ fetchedAt: stamp.toISOString(), zones: next });
      return;
    }

    // Failed. Keep showing whatever we last had, and say how old it is.
    if (failed && !cached) {
      setZones(startingZones());
      setFetchedAt(bundledDate());
    }
    setSync('offline');
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * The list is published daily, so fetching only at mount would leave an app
   * that stays open — or sits backgrounded overnight — showing yesterday's
   * sheet under yesterday's stamp. Refetch when it returns to the foreground,
   * and when the day has turned over since the list on screen was fetched.
   */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      if (next !== 'active') return;
      if (fetchedAt && ageInDays(fetchedAt) === 0) return;
      void load();
    });
    return () => subscription.remove();
  }, [load, fetchedAt]);

  const simulateOffline = useCallback(() => setSync('offline'), []);

  return { zones, sync, fetchedAt, refresh: () => void load(), simulateOffline };
}

/** 'Fetched 06:42 · GoSafe list' / 'Fetching the list…' / 'Offline · list is 2 days old' */
export function syncLabel(sync: Sync, fetchedAt: Date | null, now = new Date()): string {
  if (sync === 'syncing') return 'Fetching the published list…';
  if (IS_FIXTURE) return 'Sample data · no feed configured';
  if (!FEED_URL) {
    return fetchedAt
      ? `Built-in list · ${PUBLISHER} ${dayLabel(fetchedAt)}`
      : `Built-in list · ${PUBLISHER}`;
  }
  if (sync === 'offline') return `Offline · list is ${ageLabel(fetchedAt, now)}`;
  if (!fetchedAt) return `No list fetched yet · ${PUBLISHER} list`;
  return `Fetched ${clockLabel(fetchedAt)} · ${PUBLISHER} list`;
}

export const clockLabel = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function ageInDays(fetchedAt: Date | null, now = new Date()): number {
  if (!fetchedAt) return Number.POSITIVE_INFINITY;
  const a = new Date(fetchedAt).setHours(0, 0, 0, 0);
  const b = new Date(now).setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

function ageLabel(fetchedAt: Date | null, now: Date): string {
  const days = ageInDays(fetchedAt, now);
  if (!Number.isFinite(days)) return 'no list cached';
  if (days === 0) return 'list is from today';
  if (days === 1) return 'list is 1 day old';
  return `list is ${days} days old`;
}
