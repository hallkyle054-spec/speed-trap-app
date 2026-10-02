import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Polyline } from 'react-native-maps';

import { Place, ROUTING_CONFIGURED, Route, routeBetween } from '../data/directions';
import { LatLng, formatDistance } from '../data/geo';
import { trackOffRoute } from '../data/reroute';
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
 * zone is.
 *
 * The map follows you until you drag it, and then stops: a map that snaps back
 * half a second after you have moved it is a map you cannot look ahead on. The
 * recentre bubble puts it back on you and starts the following again.
 *
 * Pinch works, and the bubbles stay for when a thumb is all that is free. The
 * two are kept in step by reading the camera back after a gesture rather than
 * assuming: this component's idea of the zoom has to match the map's, or the
 * next time it follows your position it would snap the zoom back to whatever it
 * last believed.
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
  /** Dragging the map stops it following, until the recentre bubble is pressed. */
  const [following, setFollowing] = useState(true);
  const [routing, setRouting] = useState(false);
  const [route, setRoute] = useState<{ route: Route; to: Place } | null>(null);
  const [rerouting, setRerouting] = useState(false);

  /** Off-route bookkeeping, in refs: it changes on every fix and draws nothing. */
  const strayFixes = useRef(0);
  const lastRerouteAt = useRef(0);
  const inFlight = useRef(false);

  /**
   * Miss a turn and the purple line is redrawn from where you actually are.
   *
   * The decision is in `trackOffRoute` so it can be tested without a map: a
   * single stray fix is GPS noise, a few seconds of them is a missed turn, and
   * there is a floor under how often a new route may be asked for because each
   * one is a billed request. A failed attempt keeps the old line rather than
   * clearing it — a stale route is more use than none.
   */
  useEffect(() => {
    if (!route || !position) {
      strayFixes.current = 0;
      return;
    }
    const verdict = trackOffRoute({
      position,
      path: route.route.path,
      destination: route.to.location,
      strayFixes: strayFixes.current,
      lastRerouteAt: lastRerouteAt.current,
      now: Date.now(),
    });
    strayFixes.current = verdict.strayFixes;
    if (!verdict.reroute || inFlight.current) return;

    inFlight.current = true;
    lastRerouteAt.current = Date.now();
    setRerouting(true);
    const to = route.to;
    routeBetween({ id: 'here', name: 'Here', address: '', location: position }, to)
      .then(found => setRoute(current => (current?.to.id === to.id ? { route: found, to } : current)))
      .catch(() => {})
      .finally(() => {
        inFlight.current = false;
        setRerouting(false);
      });
  }, [position?.latitude, position?.longitude, route]);

  // Follow the fix. At two a second this is the only thing moving on screen.
  useEffect(() => {
    if (!following || !position) return;
    mapRef.current?.animateCamera({ center: position, zoom }, { duration: 400 });
  }, [following, position?.latitude, position?.longitude, zoom]);

  const nudgeZoom = (by: number) => {
    const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + by));
    setZoom(next);
    // While following, the effect above moves the camera. While panned away it
    // does not run, so the zoom is applied here without dragging the view back.
    if (!following) mapRef.current?.animateCamera({ zoom: next }, { duration: 200 });
  };

  const recentre = () => {
    setFollowing(true);
    if (position) mapRef.current?.animateCamera({ center: position, zoom }, { duration: 400 });
  };

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
        scrollEnabled
        zoomEnabled
        onPanDrag={() => setFollowing(false)}
        // Only a real gesture writes back; our own animations report here too,
        // and taking those would fight the follow.
        onRegionChangeComplete={(_region, details) => {
          if (!details?.isGesture) return;
          mapRef.current
            ?.getCamera()
            .then(camera => {
              if (typeof camera?.zoom === 'number') {
                setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camera.zoom)));
              }
            })
            .catch(() => {});
        }}
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
        {route ? (
          <Polyline
            coordinates={route.route.path}
            strokeColor={t.tempRoute}
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
            {rerouting ? 'Re-routing…' : `${route.to.name} · ${route.route.minutes} min`}
          </Text>
        ) : null}
      </View>

      <View style={[styles.zoom, { bottom: insets.bottom + 10 }]}>
        {/* Always rendered, so the stack never shifts under a moving thumb. */}
        <Bubble
          label="recentre"
          onPress={recentre}
          disabled={following || !position}
          glyph={<Crosshair />}
        />
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
          onPress={() => {
            if (route) {
              setRoute(null);
              strayFixes.current = 0;
              lastRerouteAt.current = 0;
            } else setRouting(true);
          }}
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

/**
 * A ring around a dot, drawn rather than set: the obvious glyphs for this are
 * not in either of the app's two fonts, and what Android falls back to for them
 * is nobody's decision.
 */
function Crosshair() {
  const { t } = useTheme();
  return (
    <View style={[styles.ring, { borderColor: t.ink }]}>
      <View style={[styles.ringDot, { backgroundColor: t.ink }]} />
    </View>
  );
}

function Bubble({
  label,
  onPress,
  disabled,
  glyph,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  /** Drawn instead of the label, when a glyph reads faster than a character. */
  glyph?: React.ReactNode;
}) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        label === '+' ? 'Zoom in' : label === '–' ? 'Zoom out' : 'Recentre on me'
      }
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
      {glyph ?? <Text style={[display(20), { color: t.ink }]}>{label}</Text>}
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
  ring: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringDot: { width: 5, height: 5, borderRadius: 3 },
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
