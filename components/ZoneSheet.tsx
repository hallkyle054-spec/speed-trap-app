import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { PUBLISHER } from '../data/feed';
import { formatDistance } from '../data/geo';
import { Zone, ZoneStatus, limitLabel, listedSince, statusLabel } from '../data/zones';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { body, display, kicker, tnum } from '../theme/type';
import { Button } from './Button';

type Props = {
  zone: Zone | null;
  status: ZoneStatus | null;
  distance: number | null;
  onClose: () => void;
  onDrive: (zone: Zone) => void;
  bottomInset: number;
};

/** Bottom-anchored detail sheet — the only elevated surface in the app. */
export function ZoneSheet({ zone, status, distance, onClose, onDrive, bottomInset }: Props) {
  const { t } = useTheme();
  if (!zone || !status) return null;

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable
        accessibilityLabel="Dismiss"
        onPress={onClose}
        style={[styles.scrim, { backgroundColor: t.scrim }]}
      />
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: t.bg,
            borderTopColor: t.rule,
            shadowColor: t.shadow,
            paddingBottom: 20 + bottomInset,
          },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: t.rule3 }]} />

        <Text
          style={[
            kicker(9.5, 0.14),
            { color: status === 'listed' ? t.accentInk : t.ink50 },
          ]}
        >
          {statusLabel(status)}
        </Text>
        <Text style={[display(30, -0.02), styles.road, { color: t.ink }]}>{zone.road}</Text>
        <Text style={[body(14), { color: t.ink80 }]}>{zone.name}</Text>

        <View style={[styles.divider, { backgroundColor: t.rule }]} />

        <View style={styles.grid}>
          <Cell label="Speed limit" value={limitLabel(zone)} />
          <Cell label="Distance" value={distance == null ? '—' : formatDistance(distance)} />
          <Cell label="Listed since" value={listedSince(zone)} />
          <Cell label="Source" value={`${PUBLISHER} list`} figures={false} />
        </View>

        <View style={[styles.disclosure, { borderLeftColor: t.accent }]}>
          <Text style={[body(11.5), styles.disclosureText, { color: t.ink70 }]}>
            Published zone — camera not confirmed. {zone.note}
          </Text>
        </View>

        <View style={styles.actions}>
          <Button label="Close" tone="quiet" onPress={onClose} style={styles.action} />
          <Button label="Drive this way" onPress={() => onDrive(zone)} style={styles.action} />
        </View>
      </View>
    </Modal>
  );
}

function Cell({
  label,
  value,
  figures = true,
}: {
  label: string;
  value: string;
  figures?: boolean;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.cell}>
      <Text style={[kicker(9.5, 0.12), { color: t.ink50 }]}>{label}</Text>
      <Text style={[display(23), figures ? tnum : null, styles.cellValue, { color: t.ink }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingTop: 14,
    paddingHorizontal: 18,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 32,
    shadowOpacity: 1,
    elevation: 12,
  },
  handle: { width: 38, height: 3, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  road: { marginTop: 6, marginBottom: 3, lineHeight: 30 * 1.08 },
  divider: { height: 1, marginVertical: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14, columnGap: 10 },
  cell: { width: '48%' },
  cellValue: { marginTop: 2 },
  disclosure: { marginTop: 15, borderLeftWidth: 2, paddingLeft: 11, paddingVertical: 2 },
  disclosureText: { lineHeight: 11.5 * 1.6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  action: { flex: 1, paddingVertical: 10 },
});
