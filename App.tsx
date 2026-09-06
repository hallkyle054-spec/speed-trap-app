import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertsScreen } from './app/AlertsScreen';
import { MapScreen } from './app/MapScreen';
import { RoutesScreen } from './app/RoutesScreen';
import { TodayScreen } from './app/TodayScreen';
import { DriveHud } from './components/DriveHud';
import { OfflineBanner } from './components/OfflineBanner';
import { CoverDrive } from './components/CoverDrive';
import { DataNoticeBanner } from './components/DataNoticeBanner';
import { TabBar, TabId } from './components/TabBar';
import { ZoneSheet } from './components/ZoneSheet';
import {
  BUNDLED_STALE_AFTER_DAYS,
  FEED_URL,
  IS_FIXTURE,
  ageInDays,
  useZoneFeed,
} from './data/feed';
import {
  Zone,
  distanceTo,
  latestListing,
  nearestZone,
  statusOf as statusOfZone,
} from './data/zones';
import { useDrive } from './state/drive';
import { SavedRoutesProvider, useSavedRoutes } from './state/savedRoutes';
import { SettingsProvider, useSettings } from './state/settings';
import { useLocation } from './state/useLocation';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';
import { useWidgetSummary } from './widgets/useWidgetSummary';

/** Zone phases turn over on the clock, so the UI re-derives them every minute. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function Verge() {
  const { t, isDark } = useTheme();
  const { settings, set, toggle } = useSettings();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const now = useMinuteClock();

  /**
   * A Flip's cover screen is small in both directions; a phone never is, even
   * in landscape. Measuring the window rather than the model keeps this working
   * on any small display without a device list to maintain.
   */
  const isCoverScreen = Math.max(width, height) < 600;

  const { zones: allZones, sync, fetchedAt, refresh, simulateOffline } = useZoneFeed();
  const { origin, isReal } = useLocation();

  const [tab, setTab] = useState<TabId>('map');
  const [sheetId, setSheetId] = useState<string | null>(null);

  /** The date of the newest list we hold; everything older reads as removed. */
  const listedOn = useMemo(() => latestListing(allZones), [allZones]);
  const statusOf = useCallback((zone: Zone) => statusOfZone(zone, listedOn), [listedOn]);

  // Keep the cover-screen widget fed with what the app currently knows.
  useWidgetSummary({ zones: allZones, listedOn, origin, originIsReal: isReal });

  /**
   * The one notice worth interrupting the design for: the list is invented, or
   * it is old enough that a driver should not lean on it.
   */
  const notice = useMemo(() => {
    if (IS_FIXTURE) {
      return {
        title: 'Sample data — not a real list',
        body:
          'No zone feed is connected. These zones are invented for testing and their positions ' +
          'are approximate. Do not drive by them.',
      };
    }
    if (!FEED_URL) {
      const age = ageInDays(fetchedAt, now);
      if (Number.isFinite(age) && age > BUNDLED_STALE_AFTER_DAYS) {
        return {
          title: `Built-in list is ${age} days old`,
          body:
            'This build carries the list from the day it was made and cannot refresh itself. ' +
            'Install a newer build to pick up changes.',
        };
      }
    }
    return null;
  }, [fetchedAt, now]);

  // The notice banner sits in the flow and takes the status-bar inset, so the
  // screen below it must not pad for it a second time.
  const screenInset = notice ? 0 : insets.top;

  /** `Show removed sites` off drops them from the map, the list and the count. */
  const zones = useMemo(
    () => (settings.showStale ? allZones : allZones.filter(z => statusOf(z) === 'listed')),
    [allZones, settings.showStale, statusOf],
  );

  const drive = useDrive(settings, zones, origin);
  const savedRoutes = useSavedRoutes();

  const sheetZone = useMemo(() => zones.find(z => z.id === sheetId) ?? null, [zones, sheetId]);

  const openZone = useCallback((zone: Zone) => setSheetId(zone.id), []);
  const closeSheet = useCallback(() => setSheetId(null), []);

  const startDrive = useCallback(
    (zone: Zone) => {
      setSheetId(null);
      drive.start(zone);
    },
    [drive],
  );

  /**
   * On the cover screen the app is only ever one thing: a live map. Tracking
   * starts on its own, because unfolding the phone to press Start drive would
   * defeat the point of it.
   */
  const coverStarted = useRef(false);
  useEffect(() => {
    if (!isCoverScreen || coverStarted.current || drive.zone || !zones.length) return;
    const target = nearestZone(zones, origin);
    if (!target) return;
    coverStarted.current = true;
    drive.start(target);
  }, [isCoverScreen, zones, origin, drive]);

  const goToTab = useCallback((next: TabId) => {
    setTab(next);
    setSheetId(null);
  }, []);

  /**
   * Android's back gesture unwinds the app one layer at a time. Without this it
   * closed the whole app from inside the drive HUD — and if anything ever hides
   * the End button again, this is the way out.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drive.zone) {
        drive.end();
        return true;
      }
      if (sheetId) {
        setSheetId(null);
        return true;
      }
      if (tab !== 'map') {
        setTab('map');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [drive, sheetId, tab]);

  const goOffline = useCallback(() => {
    simulateOffline();
    setTab('map');
  }, [simulateOffline]);


  if (isCoverScreen) {
    return (
      <View style={[styles.frame, { backgroundColor: t.bg }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <CoverDrive
          zones={zones}
          routes={savedRoutes.routes}
          statusOf={statusOf}
          mark={settings.mark}
          position={drive.position}
          distance={drive.zone ? drive.distance : null}
          chiming={drive.chiming}
          insets={{ top: insets.top, bottom: insets.bottom }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, { backgroundColor: t.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {notice ? (
        <DataNoticeBanner title={notice.title} body={notice.body} topInset={insets.top} />
      ) : null}

      {tab === 'map' ? (
        <MapScreen
          zones={zones}
          routes={savedRoutes.routes}
          statusOf={statusOf}
          origin={origin}
          originIsReal={isReal}
          mark={settings.mark}
          sync={sync}
          fetchedAt={fetchedAt}
          now={now}
          onRefresh={refresh}
          onOpenZone={openZone}
          onStartDrive={startDrive}
          topInset={screenInset}
        />
      ) : null}

      {tab === 'today' ? (
        <TodayScreen
          zones={zones}
          statusOf={statusOf}
          listedOn={listedOn}
          onOpenZone={openZone}
          topInset={screenInset}
        />
      ) : null}

      {tab === 'routes' ? (
        <RoutesScreen
          routes={savedRoutes.routes}
          zones={zones}
          onAdd={savedRoutes.add}
          onRemove={savedRoutes.remove}
          topInset={screenInset}
        />
      ) : null}

      {tab === 'alerts' ? (
        <AlertsScreen
          settings={settings}
          set={set}
          toggle={toggle}
          sync={sync}
          fetchedAt={fetchedAt}
          now={now}
          onRefresh={refresh}
          onSimulateOffline={goOffline}
          topInset={screenInset}
        />
      ) : null}

      <TabBar tab={tab} onChange={goToTab} bottomInset={insets.bottom} />

      {!IS_FIXTURE && sync === 'offline' ? (
        <OfflineBanner
          fetchedAt={fetchedAt}
          now={now}
          onRetry={refresh}
          topInset={insets.top}
        />
      ) : null}

      <ZoneSheet
        zone={sheetZone}
        status={sheetZone ? statusOf(sheetZone) : null}
        distance={sheetZone ? distanceTo(sheetZone, origin) : null}
        onClose={closeSheet}
        onDrive={startDrive}
        bottomInset={insets.bottom}
      />

      {drive.zone ? (
        <DriveHud
          zone={drive.zone}
          zones={zones}
          routes={savedRoutes.routes}
          statusOf={statusOf}
          mark={settings.mark}
          position={drive.position}
          distance={drive.distance}
          speedMph={drive.speedMph}
          chiming={drive.chiming}
          warnAt={settings.warnAt}
          source={drive.source}
          onEnd={drive.end}
          topInset={insets.top}
          bottomInset={insets.bottom}
        />
      ) : null}
    </View>
  );
}

/**
 * The five faces the design actually uses, required by file rather than through
 * the package index — importing the index pulls all ten weights of each family
 * into the bundle.
 */
const FONTS = {
  CormorantGaramond_400Regular: require('@expo-google-fonts/cormorant-garamond/400Regular/CormorantGaramond_400Regular.ttf'),
  CormorantGaramond_600SemiBold: require('@expo-google-fonts/cormorant-garamond/600SemiBold/CormorantGaramond_600SemiBold.ttf'),
  Lora_400Regular: require('@expo-google-fonts/lora/400Regular/Lora_400Regular.ttf'),
  Lora_600SemiBold: require('@expo-google-fonts/lora/600SemiBold/Lora_600SemiBold.ttf'),
  Lora_400Regular_Italic: require('@expo-google-fonts/lora/400Regular_Italic/Lora_400Regular_Italic.ttf'),
};

/** Fonts are bundled with the app, so this resolves without a network round-trip. */
function Root() {
  const { t } = useTheme();
  const [fontsLoaded] = useFonts(FONTS);

  if (!fontsLoaded) return <View style={[styles.frame, { backgroundColor: t.bg }]} />;
  return <Verge />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <SavedRoutesProvider>
          <ThemeProvider>
            <Root />
          </ThemeProvider>
        </SavedRoutesProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
});
