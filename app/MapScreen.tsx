import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';

import { Button } from '../components/Button';
import { ZoneMarks } from '../components/ZoneMarks';
import { Sync, syncLabel } from '../data/feed';
import { LatLng, formatDistance } from '../data/geo';
import {
  COUNTY_REGION,
  Zone,
  ZonePhase,
  distanceTo,
  hoursLabel,
  limitLabel,
  nearestZone,
} from '../data/zones';
import { ZoneMark } from '../state/settings';
import { useTheme } from '../theme/ThemeProvider';
import { darkMapStyle, lightMapStyle } from '../theme/mapStyle';
import { radius } from '../theme/tokens';
import { body, display, heading, kicker, tnum } from '../theme/type';

type Props = {
  zones: Zone[];
  phaseOf: (zone: Zone) => ZonePhase;
  origin: LatLng;
  originIsReal: boolean;
  mark: ZoneMark;
  sync: Sync;
  fetchedAt: Date | null;
  now: Date;
  onRefresh: () => void;
  onOpenZone: (zone: Zone) => void;
  onStartDrive: (zone: Zone) => void;
  topInset: number;
};

export function MapScreen({
  zones,
  phaseOf,
  origin,
  originIsReal,
  mark,
  sync,
  fetchedAt,
  now,
  onRefresh,
  onOpenZone,
  onStartDrive,
  topInset,
}: Props) {
  const { t, isDark } = useTheme();

  const nearest = useMemo(() => nearestZone(zones, origin), [zones, origin]);
  const nearestDistance = nearest ? distanceTo(nearest, origin) : null;

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: 16 + topInset, borderBottomColor: t.rule }]}>
        <View style={styles.kickerRow}>
          <Text style={[kicker(9.5, 0.14), { color: t.ink50 }]}>
            Sir Gaerfyrddin · Carmarthenshire
          </Text>
          <Text style={[kicker(9.5, 0.12), tnum, { color: t.ink50 }]}>{dateLabel}</Text>
        </View>

        <Text style={[display(33, -0.02), styles.h1, { color: t.ink }]}>
          Today&rsquo;s published zones
        </Text>

        <View style={styles.syncRow}>
          <View style={styles.syncStatus}>
            <View
              style={[
                styles.dot,
                { backgroundColor: sync === 'offline' ? t.accentInk : t.ink55 },
              ]}
            />
            <Text
              style={[body(11), { color: sync === 'offline' ? t.accentInk : t.ink55 }]}
              numberOfLines={1}
            >
              {syncLabel(sync, fetchedAt, now)}
            </Text>
          </View>
          <Button
            label="Refresh"
            size={12}
            letterSpacingEm={0.04}
            onPress={onRefresh}
            style={styles.refresh}
          />
        </View>
      </View>

      <View style={[styles.canvas, { backgroundColor: t.bg }]}>
        <MapView
          style={StyleSheet.absoluteFill}
          // MapLibre is the alternative if a Google key is not wanted; the token
          // styles below are written to port.
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          customMapStyle={isDark ? darkMapStyle : lightMapStyle}
          initialRegion={COUNTY_REGION}
          showsUserLocation={originIsReal}
          showsMyLocationButton={false}
          showsPointsOfInterests={false}
          showsBuildings={false}
          showsTraffic={false}
          showsCompass={false}
          toolbarEnabled={false}
        >
          {zones.map(zone => (
            <ZoneMarks
              key={zone.id}
              zone={zone}
              phase={phaseOf(zone)}
              mark={mark}
              onPress={onOpenZone}
            />
          ))}
        </MapView>

        <View style={[styles.legend, { backgroundColor: t.legendBg, borderColor: t.rule }]}>
          <LegendRow color={t.mark} label="Published for today" />
          <LegendRow color={t.ink45} label="Scheduled later" />
        </View>
      </View>

      <View style={[styles.nearest, { borderTopColor: t.rule, backgroundColor: t.bg }]}>
        <View style={styles.nearestLabelRow}>
          <Text style={[kicker(9.5, 0.13), { color: t.ink50 }]}>Nearest to you</Text>
          {nearestDistance != null ? (
            <Text style={[body(11), tnum, { color: t.ink55 }]}>
              {formatDistance(nearestDistance)}
            </Text>
          ) : null}
        </View>

        {nearest ? (
          <>
            <Text style={[heading(20, -0.01), { color: t.ink }]}>
              {nearest.road} · {nearest.name}
            </Text>
            <Text style={[body(11.5), tnum, styles.nearestMeta, { color: t.ink60 }]}>
              {nearest.window
                ? `Published ${hoursLabel(nearest)} · ${limitLabel(nearest)} · camera not confirmed`
                : `Not published today · ${limitLabel(nearest)} · camera not confirmed`}
            </Text>
            <Button
              label="Start drive"
              size={15}
              letterSpacingEm={0.03}
              onPress={() => onStartDrive(nearest)}
              style={styles.startDrive}
            />
          </>
        ) : (
          <Text style={[body(13), styles.empty, { color: t.ink50 }]}>
            Nothing published nearby today
          </Text>
        )}
      </View>
    </View>
  );
}

function LegendRow({ color, label }: { color: string; label: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.legendRow}>
      <View style={[styles.legendDot, { borderColor: color }]} />
      <Text style={[body(9.5), { color: t.ink70 }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 12, borderBottomWidth: 1 },
  kickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  h1: { marginTop: 7, marginBottom: 9, lineHeight: 33 * 1.05 },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  syncStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  refresh: { paddingVertical: 5, paddingHorizontal: 12 },

  canvas: { flex: 1, position: 'relative', overflow: 'hidden' },
  legend: {
    position: 'absolute',
    left: 14,
    bottom: 12,
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5, borderWidth: 1.5 },

  nearest: {
    borderTopWidth: 1,
    paddingTop: 13,
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  nearestLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  nearestMeta: { marginTop: 2 },
  startDrive: { marginTop: 11, paddingVertical: 11 },
  empty: { marginTop: 4, fontStyle: 'italic' },
});
