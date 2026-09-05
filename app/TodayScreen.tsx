import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PUBLISHER } from '../data/feed';
import { Zone, ZoneStatus, limitLabel, rowNote, shortDate } from '../data/zones';
import { useTheme } from '../theme/ThemeProvider';
import { body, display, heading, kicker, tnum } from '../theme/type';

type Props = {
  zones: Zone[];
  statusOf: (zone: Zone) => ZoneStatus;
  /** The date of the list on screen, or null when nothing has been fetched. */
  listedOn: string | null;
  onOpenZone: (zone: Zone) => void;
  topInset: number;
};

/** The day's sheet, scannable by road. */
export function TodayScreen({ zones, statusOf, listedOn, onOpenZone, topInset }: Props) {
  const { t } = useTheme();


  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: 16 + topInset, borderBottomColor: t.rule }]}>
        <Text style={[kicker(9.5, 0.14), { color: t.ink50 }]}>
          {listedOn ? `The published list · ${shortDate(listedOn)}` : 'The published list'}
        </Text>
        <Text style={[display(31, -0.02), styles.h1, { color: t.ink }]}>
          {zones.length} {zones.length === 1 ? 'zone' : 'zones'} published
        </Text>
      </View>

      <ScrollView style={styles.list}>
        {zones.map(zone => {
          const status = statusOf(zone);
          return (
            <Pressable
              key={zone.id}
              accessibilityRole="button"
              accessibilityLabel={`${zone.road} ${zone.name}`}
              onPress={() => onOpenZone(zone)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: t.rule, backgroundColor: pressed ? t.hover : 'transparent' },
              ]}
            >
              <View style={styles.rowTop}>
                <Text
                  numberOfLines={2}
                  style={[
                    heading(19, -0.01),
                    tnum,
                    styles.rowRoad,
                    { color: status === 'listed' ? t.mark : t.ink45 },
                  ]}
                >
                  {zone.road}
                </Text>
                <Text style={[kicker(10.5, 0.09), tnum, styles.rowLimit, { color: t.ink50 }]}>
                  {limitLabel(zone)}
                </Text>
              </View>
              {zone.name ? (
                <Text style={[body(13), styles.rowName, { color: t.ink80 }]}>{zone.name}</Text>
              ) : null}
              <Text style={[body(10.5), tnum, styles.rowNote, { color: t.ink50 }]}>
                {rowNote(zone, status)}
              </Text>
            </Pressable>
          );
        })}

        <Text style={[body(11), styles.closing, { color: t.ink50 }]}>
          Every entry above is a zone {PUBLISHER} has published for enforcement. It is not a
          confirmation that a camera van is present, and vans operate in zones that may not appear
          here.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1 },
  h1: { marginTop: 7, lineHeight: 31 * 1.05 },
  list: { flex: 1 },
  row: { paddingVertical: 14, paddingHorizontal: 18, borderBottomWidth: 1 },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 12,
  },
  rowRoad: { flexShrink: 1 },
  rowLimit: { flexShrink: 0 },
  rowName: { marginTop: 1 },
  rowNote: { marginTop: 4 },
  closing: { marginTop: 16, marginHorizontal: 18, marginBottom: 22, lineHeight: 11 * 1.6 },
});
