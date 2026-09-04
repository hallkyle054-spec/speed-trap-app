import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

import { formatDistance, pathLength } from '../data/geo';
import { Zone, zoneTitle } from '../data/zones';
import { DriveSource } from '../state/drive';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { body, display, heading, kicker, tnum } from '../theme/type';
import { Button } from './Button';

type Props = {
  zone: Zone;
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
  distance,
  speedMph,
  chiming,
  warnAt,
  source,
  onEnd,
  topInset,
  bottomInset,
}: Props) {
  const { t } = useTheme();

  const metres = Math.max(0, Math.round(distance));
  const figure = metres <= 0 ? 'Now' : metres >= 1000 ? (metres / 1000).toFixed(1) : String(metres);
  const unit =
    metres <= 0 ? 'entering the zone' : metres >= 1000 ? 'km to the zone' : 'metres to the zone';
  const heads = metres <= 0 ? 'Zone begins' : metres <= warnAt ? 'Published zone ahead' : 'Approaching';
  const over = zone.limitMph != null && speedMph > zone.limitMph;

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
        <Text style={[kicker(9.5, 0.16), { color: t.ink50 }]} numberOfLines={1}>
          Driving · {zone.road} {source === 'simulated' ? '· simulated' : ''}
        </Text>
        <Button
          label="End"
          tone="quiet"
          size={12}
          onPress={onEnd}
          style={styles.endButton}
        />
      </View>

      <View style={styles.centre}>
        <Text style={[kicker(10, 0.16), { color: t.accentInk }]}>{heads}</Text>
        <Text style={[display(110, -0.04), tnum, styles.figure, { color: t.ink }]}>{figure}</Text>
        <Text style={[display(26), styles.unit, { color: t.ink55 }]}>{unit}</Text>

        <View style={[styles.divider, { backgroundColor: t.rule3 }]} />

        <Text style={[heading(25, -0.01), { color: t.ink }]}>
          {zoneTitle(zone)}
        </Text>
        <Text style={[body(12.5), tnum, styles.meta, { color: t.ink60 }]}>
          {zone.path.length >= 2
            ? `Published site · zone runs ${formatDistance(pathLength(zone.path))}`
            : 'Published site · extent not published'}
        </Text>

        <View style={[styles.disclosure, { borderLeftColor: t.accent }]}>
          <Text style={[body(12), styles.disclosureText, { color: t.ink70 }]}>
            Published zone — camera not confirmed.
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
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  endButton: { paddingVertical: 4, paddingHorizontal: 11 },
  centre: { flex: 1, justifyContent: 'center' },
  figure: { marginTop: 10, lineHeight: 110 * 0.92 },
  unit: { marginTop: -2 },
  divider: { height: 1, marginTop: 22, marginBottom: 18 },
  meta: { marginTop: 4 },
  disclosure: { marginTop: 14, borderLeftWidth: 2, paddingLeft: 11, paddingVertical: 2 },
  disclosureText: { lineHeight: 12 * 1.55 },
  cards: { flexDirection: 'row', gap: 16, alignItems: 'stretch' },
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
