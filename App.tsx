import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AlertsScreen } from './app/AlertsScreen';
import { MapScreen } from './app/MapScreen';
import { RoutesScreen } from './app/RoutesScreen';
import { TodayScreen } from './app/TodayScreen';
import { DriveHud } from './components/DriveHud';
import { OfflineBanner } from './components/OfflineBanner';
import { SampleDataBanner } from './components/SampleDataBanner';
import { TabBar, TabId } from './components/TabBar';
import { ZoneSheet } from './components/ZoneSheet';
import { IS_FIXTURE, useZoneFeed } from './data/feed';
import { fixtureRoutes } from './data/routes';
import { Zone, distanceTo, latestListing, statusOf as statusOfZone } from './data/zones';
import { useDrive } from './state/drive';
import { SettingsProvider, useSettings } from './state/settings';
import { useLocation } from './state/useLocation';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

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
  const now = useMinuteClock();

  const { zones: allZones, sync, fetchedAt, refresh, simulateOffline } = useZoneFeed();
  const { origin, isReal } = useLocation();

  const [tab, setTab] = useState<TabId>('map');
  const [sheetId, setSheetId] = useState<string | null>(null);

  /** The date of the newest list we hold; everything older reads as removed. */
  const listedOn = useMemo(() => latestListing(allZones), [allZones]);
  const statusOf = useCallback((zone: Zone) => statusOfZone(zone, listedOn), [listedOn]);

  // The sample-data banner sits in the flow and takes the status-bar inset,
  // so the screen below it must not pad for it a second time.
  const screenInset = IS_FIXTURE ? 0 : insets.top;

  /** `Show removed sites` off drops them from the map, the list and the count. */
  const zones = useMemo(
    () => (settings.showStale ? allZones : allZones.filter(z => statusOf(z) === 'listed')),
    [allZones, settings.showStale, statusOf],
  );

  const drive = useDrive(settings, zones);

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

  const goToTab = useCallback((next: TabId) => {
    setTab(next);
    setSheetId(null);
  }, []);

  const goOffline = useCallback(() => {
    simulateOffline();
    setTab('map');
  }, [simulateOffline]);


  return (
    <View style={[styles.frame, { backgroundColor: t.bg }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {IS_FIXTURE ? <SampleDataBanner topInset={insets.top} /> : null}

      {tab === 'map' ? (
        <MapScreen
          zones={zones}
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
        <RoutesScreen routes={fixtureRoutes} zones={zones} topInset={screenInset} />
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
        <ThemeProvider>
          <Root />
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1 },
});
