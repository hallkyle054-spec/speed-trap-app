import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Circle, Marker, Polyline } from 'react-native-maps';

import { LatLng } from '../data/geo';
import { Zone, ZonePhase } from '../data/zones';
import { useTheme } from '../theme/ThemeProvider';
import { Tokens } from '../theme/tokens';
import { ZoneMark } from '../state/settings';

/** Minimum tap target, regardless of how small the mark is drawn. */
const TAP = 44;
/** The radius treatment's honest-about-uncertainty circle. */
const RADIUS_M = 600;

const markColor = (t: Tokens, phase: ZonePhase) => (phase === 'active' ? t.mark : t.ink45);

const midpoint = (path: readonly LatLng[]): LatLng => path[Math.floor(path.length / 2)];

/** scale(1) → scale(2.1), opacity .55 → 0, 2.6s ease-out, on active zones only. */
function PulseRing({ color }: { color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 2600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        {
          borderColor: color,
          opacity: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.55, 0, 0] }),
          transform: [
            { scale: progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 2.1, 2.1] }) },
          ],
        },
      ]}
    />
  );
}

type Props = {
  zone: Zone;
  phase: ZonePhase;
  mark: ZoneMark;
  onPress: (zone: Zone) => void;
};

export function ZoneMarks({ zone, phase, mark, onPress }: Props) {
  const { t } = useTheme();
  const color = markColor(t, phase);
  const active = phase === 'active';
  const label = `${zone.road} ${zone.name}`;

  if (mark === 'segment') {
    // Recommended treatment: the published data is a stretch of road, so the
    // mark is a bar along it.
    //
    // The design asks for a ground-coloured casing under the bar. That was
    // built as a second, wider polyline beneath it — which does not work: the
    // New Architecture's Polyline has no `zIndex` prop (see
    // react-native-maps/src/specs/NativeComponentPolyline.ts), so the casing's
    // draw order is undefined and it can land on top, painting the mark out in
    // exactly the map's background colour. A single stroke is drawn instead,
    // weighted to read on its own against the hairline roads of the basemap.
    return (
      <>
        <Polyline
          coordinates={zone.path}
          strokeColor={color}
          strokeWidth={7}
          lineCap="round"
          lineJoin="round"
          tappable
          onPress={() => onPress(zone)}
        />
        <TapTarget coordinate={midpoint(zone.path)} label={label} onPress={() => onPress(zone)} />
      </>
    );
  }

  if (mark === 'radius') {
    return (
      <>
        <Circle
          center={midpoint(zone.path)}
          radius={RADIUS_M}
          strokeColor={color}
          strokeWidth={1}
          fillColor={t.accentTint}
        />
        <TapTarget coordinate={midpoint(zone.path)} label={label} onPress={() => onPress(zone)} />
      </>
    );
  }

  return (
    <Marker
      coordinate={midpoint(zone.path)}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={() => onPress(zone)}
      accessibilityLabel={label}
      // Only redraw continuously while a ring is actually animating.
      tracksViewChanges={active}
    >
      <View style={styles.tap}>
        {active ? <PulseRing color={color} /> : null}
        <View style={[styles.dotOuter, { backgroundColor: t.bg, borderColor: color }]}>
          <View style={[styles.dotInner, { backgroundColor: color }]} />
        </View>
      </View>
    </Marker>
  );
}

/** An invisible 44 × 44 marker, so polylines and circles are reliably tappable. */
function TapTarget({
  coordinate,
  label,
  onPress,
}: {
  coordinate: LatLng;
  label: string;
  onPress: () => void;
}) {
  return (
    <Marker
      coordinate={coordinate}
      anchor={{ x: 0.5, y: 0.5 }}
      onPress={onPress}
      opacity={0}
      accessibilityLabel={label}
      tracksViewChanges={false}
    >
      <View style={styles.tap} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  tap: { width: TAP, height: TAP, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  dotOuter: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 5, height: 5, borderRadius: 2.5 },
});
