import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Circle, Marker } from 'react-native-maps';

import { LatLng } from '../data/geo';
import { Zone, ZoneStatus, zoneTitle } from '../data/zones';
import { useTheme } from '../theme/ThemeProvider';
import { Tokens } from '../theme/tokens';
import { ZoneMark } from '../state/settings';

/** Minimum tap target, regardless of how small the mark is drawn. */
const TAP = 44;
/** The radius treatment's honest-about-uncertainty circle. */
const RADIUS_M = 600;

const markColor = (t: Tokens, status: ZoneStatus) =>
  status === 'listed' ? t.mark : t.markRemoved;

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
  status: ZoneStatus;
  mark: ZoneMark;
  onPress: (zone: Zone) => void;
};

export function ZoneMarks({ zone, status, mark, onPress }: Props) {
  const { t } = useTheme();
  const color = markColor(t, status);
  const active = status === 'listed';
  const label = zoneTitle(zone);

  const at = midpoint(zone.path);
  // 'both' draws the circle *and* the point: the circle says roughly where the
  // zone is, the point says exactly what was published. They answer different
  // questions, so wanting both on at once is not a contradiction.
  const showRadius = mark === 'radius' || mark === 'both';
  const showPin = mark === 'pin' || mark === 'both';

  return (
    <>
      {showRadius ? (
        <Circle
          center={at}
          radius={RADIUS_M}
          strokeColor={color}
          strokeWidth={1}
          fillColor={active ? t.accentTint : t.markRemovedTint}
        />
      ) : null}

      {showPin ? (
        <Marker
          coordinate={at}
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
      ) : (
        // A circle alone is not reliably tappable, so it gets an invisible
        // target. With a point drawn there is already one, and two stacked
        // markers would make the zone sheet open twice.
        <TapTarget coordinate={at} label={label} onPress={() => onPress(zone)} />
      )}
    </>
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
