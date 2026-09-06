import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { Place, ROUTING_CONFIGURED, Route } from '../data/directions';
import { LatLng, formatDistance } from '../data/geo';
import { SavedRoute } from '../data/routes';
import { Zone, ZoneStatus } from '../data/zones';
import { ZoneMark } from '../state/settingsSchema';
import { useTheme } from '../theme/ThemeProvider';
import { darkMapStyle, lightMapStyle } from '../theme/mapStyle';
import { body, display, kicker, tnum } from '../theme/type';
import { CoverRoute } from './CoverRoute';
import { ZoneMarks } from './ZoneMarks';

/**
 * The cover-screen view: a map, and almost nothing else.
 *
 * A Flip's Flex Window is about four inches and is read at a glance with one
 * hand on the wheel, so this drops everything the phone screen carries except
 * the two things that matter — where you are, and how far the next published
 * zone is. Two zoom bubbles, because that is the one adjustment worth making
 * without unfolding the phone.
 */

const MIN_ZOOM = 11;
const MAX_ZOOM = 17;
const DEFAULT_ZOOM = 15;

export function CoverDrive({
  zones,
  routes,
  statusOf,
  mark,
  position,
  distance,
  chiming,
  insets,
}: {
  zones: Zone[];
  routes: SavedRoute[];
  statusOf: (zone: Zone) => ZoneStatus;
  mark: ZoneMark;
  position: LatLng | null;
  /** Metres to the nearest zone, or null before a fix. */
  distance: number | null;
  chiming: boolean;
  insets: { top: number; bottom: number };
}) {
  const { t, isDark } = useTheme();
  const mapRef = useRef<MapView>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  /**
   * A route set from here, and the panel for setting one. It is deliberately
   * not saved: this is where the driver is going now, from where they are now,
   * and it stops meaning anything the moment either changes.
   */
  const [routing, setRouting] = useState(false);
  const [route, setRoute] = useState<{ route: Route; to: Place } | null>(null);

  // Follow the fix. At two a second this is the only thing moving on screen.
  useEffect(() => {
    if (!position) return;
    mapRef.current?.animateCamera({ center: position, zoom }, { duration: 400 });
  }, [position?.latitude, position?.longitude, zoom]);

  const nudgeZoom = (by: number) =>
    setZoom(current => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current + by)));

  return (
    <View style={[styles.root, { backgroundColor: t.bg }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={isDark ? darkMapStyle : lightMapStyle}
        initialRegion={{
          latitude: position?.latitude ?? 51.83,
          longitude: position?.longitude ?? -4.18,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
        showsUserLocation
        showsMyLocationButton={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        showsTraffic={false}
        showsCompass={false}
        toolbarEnabled={false}
        scrollEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        zoomEnabled={false}
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
        {route ? (
          <Polyline
            coordinates={route.route.path}
            strokeColor={t.accentInk}
            strokeWidth={6}
            lineCap="round"
            lineJoin="round"
          />
        ) : null}
        {zones.map(z => (
          <ZoneMarks key={z.id} zone={z} status={statusOf(z)} mark={mark} onPress={() => {}} />
        ))}
      </MapView>

      {/* Distance to the next published zone, over the map. */}
      <View
        style={[
          styles.readout,
          { backgroundColor: t.legendBg, borderColor: chiming ? t.accent : t.rule, top: insets.top + 8 },
        ]}
      >
        <Text style={[kicker(8.5, 0.14), { color: t.ink50 }]}>NEXT ZONE</Text>
        <Text style={[display(26, -0.02), tnum, styles.distance, { color: chiming ? t.accentInk : t.ink }]}>
          {distance == null ? '—' : formatDistance(distance)}
        </Text>
        {route ? (
          <Text numberOfLines={1} style={[body(9), styles.heading, { color: t.ink55 }]}>
            {`${route.to.name} · ${route.route.minutes} min`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.zoom, { bottom: insets.bottom + 10 }]}>
        <Bubble label="+" onPress={() => nudgeZoom(1)} disabled={zoom >= MAX_ZOOM} />
        <Bubble label="–" onPress={() => nudgeZoom(-1)} disabled={zoom <= MIN_ZOOM} />
      </View>

      {/*
        Routing needs somewhere to route from, so the button waits for a fix
        rather than offering something that cannot work.
      */}
      {ROUTING_CONFIGURED && position ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={route ? 'Clear route' : 'Set a route'}
          onPress={() => (route ? setRoute(null) : setRouting(true))}
          style={({ pressed }) => [
            styles.routeButton,
            {
              bottom: insets.bottom + 10,
              left: 8,
              backgroundColor: pressed ? t.accentTint : t.legendBg,
              borderColor: t.rule2,
            },
          ]}
        >
          <Text style={[kicker(9, 0.14), { color: t.ink }]}>{route ? 'CLEAR' : 'ROUTE'}</Text>
        </Pressable>
      ) : null}

      {routing && position ? (
        <CoverRoute
          origin={position}
          insets={insets}
          onCancel={() => setRouting(false)}
          onRouted={(found, to) => {
            setRoute({ route: found, to });
            setRouting(false);
          }}
        />
      ) : null}

      {position ? null : (
        <View style={[styles.locating, { backgroundColor: t.legendBg, borderColor: t.rule }]}>
          <Text style={[body(10), { color: t.ink60 }]}>Waiting for a fix…</Text>
        </View>
      )}
    </View>
  );
}

function Bubble({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label === '+' ? 'Zoom in' : 'Zoom out'}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.bubble,
        {
          backgroundColor: pressed ? t.accentTint : t.legendBg,
          borderColor: t.rule2,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={[display(20), { color: t.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  readout: {
    position: 'absolute',
    left: 8,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  distance: { marginTop: 1 },
  heading: { marginTop: 1 },
  zoom: { position: 'absolute', right: 8, gap: 8 },
  // Same 44 dp target as the zoom bubbles, opposite corner.
  routeButton: {
    position: 'absolute',
    minHeight: 44,
    minWidth: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 22,
  },
  // 44 dp, reachable one-handed on a four-inch panel.
  bubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locating: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 12,
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
});
