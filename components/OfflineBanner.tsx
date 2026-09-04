import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { dayLabel } from '../data/dates';
import { ageInDays } from '../data/feed';
import { useTheme } from '../theme/ThemeProvider';
import { body, heading, tnum } from '../theme/type';
import { Button } from './Button';

/** Top-anchored strip. Says how old the list is, because zones change daily. */
export function OfflineBanner({
  fetchedAt,
  now,
  onRetry,
  topInset,
}: {
  fetchedAt: Date | null;
  now: Date;
  onRetry: () => void;
  topInset: number;
}) {
  const { t } = useTheme();
  const days = ageInDays(fetchedAt, now);

  const heading1 = fetchedAt
    ? `Offline — showing ${dayLabel(fetchedAt)}`
    : 'Offline — no list cached';
  const sub = !Number.isFinite(days)
    ? 'Nothing has been fetched on this device yet.'
    : days === 0
      ? 'This list was fetched today. Zones change daily.'
      : `This list is ${days} ${days === 1 ? 'day' : 'days'} old. Zones change daily.`;

  return (
    <View style={[styles.banner, { backgroundColor: t.bg, paddingTop: 11 + topInset }]}>
      <View style={styles.text}>
        <Text style={[heading(15), { color: t.ink }]}>{heading1}</Text>
        <Text style={[body(11), tnum, { color: t.ink60 }]}>{sub}</Text>
      </View>
      <Button label="Retry" size={12} onPress={onRetry} style={styles.retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 4,
    paddingBottom: 11,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  text: { flexShrink: 1 },
  retry: { paddingVertical: 5, paddingHorizontal: 11 },
});
