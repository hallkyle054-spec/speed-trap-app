import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { LatLng, formatDistance, pathLength } from '../data/geo';
import { SavedRoute } from '../data/routes';
import { Zone, ZoneStatus, zoneTitle } from '../data/zones';
import { ZoneMark } from '../state/settingsSchema';
import { darkMapStyle, lightMapStyle } from '../theme/mapStyle';
import { ZoneMarks } from './ZoneMarks';
import { DriveSource } from '../state/drive';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { body, display, heading, kicker, tnum } from '../theme/type';
import { Button } from './Button';

type Props = {
  zone: Zone;
  /** Everything to plot: the zones around the driver and their saved routes. */
  zones: Zone[];
  routes: SavedRoute[];
  statusOf: (zone: Zone) => ZoneStatus;
  mark: ZoneMark;
  /** The latest fix, or null while waiting for one. */
  position: LatLng | null;
  distance: number;
  speedMph: number;
  chiming: boolean;
  warnAt: number;
  source: DriveSource;
  onEnd: () => void;
  topInset: number;
  bottomInset: number;
};

/** Full-frame overlay. One big glanceable number, and nothing that moves except the chime dot. */
export function DriveHud({
  zone,
  zones,
  routes,
  statusOf,
  mark,
  position,
  distance,
  speedMph,
  chiming,
  warnAt,
  source,
  onEnd,
  topInset,
  bottomInset,
}: Props) {
  const { t, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);

  const metres = Math.max(0, Math.round(distance));
  const figure = metres <= 0 ? 'Now' : metres >= 1000 ? (metres / 1000).toFixed(1) : String(metres);
  const unit =
    metres <= 0 ? 'entering the zone' : metres >= 1000 ? 'km to the zone' : 'metres to the zone';
  const heads = metres <= 0 ? 'Zone begins' : metres <= warnAt ? 'Published zone ahead' : 'Approaching';
  const over = zone.limitMph != null && speedMph > zone.limitMph;

  const focus = position ?? zone.path[0];
  useEffect(() => {
    if (!focus) return;
    mapRef.current?.animateCamera({ center: focus, zoom: 15 }, { duration: 700 });
  }, [focus?.latitude, focus?.longitude]);

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: t.bg,
          paddingTop: 24 + topInset,
          paddingBottom: 20 + bottomInset,
        },
      ]}
    >
      <View style={styles.topRow}>
        {/*
          The label must shrink. Real road names run long ("A476 Cross Hands
          Rdbt To Phoenix Inn"), and without flexShrink the text claimed its
          full measured width and pushed End clean off the screen — leaving no
          way out of the drive HUD.
        */}
        <Text style={[kicker(9.5, 0.16), styles.driving, { color: t.ink50 }]} numberOfLines={1}>
          Driving · {zone.road}
          {source === 'simulated' ? ' · simulated' : ''}
        </Text>
        <Button
          label="End"
          tone="quiet"
          size={12}
          onPress={onEnd}
          style={styles.endButton}
        />
      </View>

      {/*
        The map earns its place here: a number alone tells you how far, not
        which way. It stays below the readout in the visual hierarchy — the
        distance is still the thing you glance at.
      */}
      <View style={[styles.map, { borderColor: t.rule }]}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          initialRegion={{
            latitude: focus?.latitude ?? 51.83,
            longitude: focus?.longitude ?? -4.18,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
          followsUserLocation
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          showsBuildings={false}
          showsTraffic={false}
          showsCompass={false}
          toolbarEnabled={false}
          // Nothing on this screen should need a deliberate touch while driving.
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
        >
          {routes.map(route => (
            <Polyline
              key={route.id}
              coordinates={route.path}
              strokeColor={t.accent}
              strokeWidth={4}
              lineCap="round"
              lineJoin="round"
            />
          ))}
          {zones.map(z => (
            <ZoneMarks key={z.id} zone={z} status={statusOf(z)} mark={mark} onPress={() => {}} />
          ))}
        </MapView>
      </View>

      <View style={styles.centre}>
        <Text style={[kicker(10, 0.16), { color: t.accentInk }]}>{heads}</Text>
        <Text style={[display(84, -0.04), tnum, styles.figure, { color: t.ink }]}>{figure}</Text>
        <Text style={[display(22), styles.unit, { color: t.ink55 }]}>{unit}</Text>

        <View style={[styles.divider, { backgroundColor: t.rule3 }]} />

        <Text style={[heading(25, -0.01), tnum, { color: t.ink }]}>
          {zoneTitle(zone)}
        </Text>
        <Text style={[body(12.5), tnum, styles.meta, { color: t.ink60 }]}>
          {zone.path.length >= 2
            ? `Published zone · runs ${formatDistance(pathLength(zone.path))}`
            : 'Published zone · extent not published'}
        </Text>

        <View style={[styles.disclosure, { borderLeftColor: t.accent }]}>
          <Text style={[body(12), styles.disclosureText, { color: t.ink70 }]}>
            A published zone. A mobile camera may or may not be here.
          </Text>
        </View>
      </View>

      <View style={styles.cards}>
        <Card label="Your speed" value={String(speedMph)} color={over ? t.accentInk : t.ink} />
        <Card
          label="Limit"
          value={zone.limitMph == null ? '—' : String(zone.limitMph)}
          color={t.ink}
        />
      </View>

      {chiming ? (
        <View style={[styles.chime, { borderColor: t.accent }]}>
          <ChimeDot color={t.accentInk} />
          <Text style={[heading(16), { color: t.accentInk }]}>Chime — zone ahead</Text>
        </View>
      ) : null}
    </View>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  const { t } = useTheme();
  return (
    <View style={[styles.card, { borderColor: t.rule3 }]}>
      <Text style={[kicker(9.5, 0.13), { color: t.ink50 }]}>{label}</Text>
      <Text style={[display(38), tnum, styles.cardValue, { color }]}>{value}</Text>
    </View>
  );
}

/** zbar — opacity .25 → 1 → .25, 1s ease-in-out, while the chime banner is up. */
function ChimeDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.25, duration: 500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return <Animated.View style={[styles.chimeDot, { backgroundColor: color, opacity: pulse }]} />;
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 22,
    zIndex: 9,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
  },
  driving: { flexShrink: 1 },
  // 44 dp of target, whatever the label measures.
  endButton: { flexShrink: 0, minWidth: 72, minHeight: 44, paddingHorizontal: 14 },
  map: {
    flex: 1,
    minHeight: 140,
    // Capped so the distance stays the dominant thing on the screen — the map
    // is for orientation, not for reading while moving.
    maxHeight: '34%',
    marginTop: 12,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  centre: { flex: 1, justifyContent: 'center', paddingTop: 12 },
  figure: { marginTop: 4, lineHeight: 84 * 0.92 },
  unit: { marginTop: -2 },
  divider: { height: 1, marginTop: 14, marginBottom: 12 },
  meta: { marginTop: 4 },
  disclosure: { marginTop: 10, borderLeftWidth: 2, paddingLeft: 11, paddingVertical: 2 },
  disclosureText: { lineHeight: 12 * 1.55 },
  cards: { flexDirection: 'row', gap: 16, alignItems: 'stretch', marginTop: 14 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  cardValue: { lineHeight: 38 * 1.1 },
  chime: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 13,
  },
  chimeDot: { width: 7, height: 7, borderRadius: 3.5 },
});
