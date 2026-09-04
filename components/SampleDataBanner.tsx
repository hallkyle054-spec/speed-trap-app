import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { body, heading } from '../theme/type';

/**
 * Shown whenever no feed is configured. The zones on screen are then invented
 * and must never be mistaken for a published list — this is the one place the
 * app is allowed to shout.
 */
export function SampleDataBanner({ topInset }: { topInset: number }) {
  const { t } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: t.bg, borderBottomColor: t.accent, paddingTop: 11 + topInset },
      ]}
    >
      <Text style={[heading(15), { color: t.accentInk }]}>Sample data — not a real list</Text>
      <Text style={[body(11), styles.sub, { color: t.ink60 }]}>
        No zone feed is connected. These zones are invented for testing and their positions are
        approximate. Do not drive by them.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderBottomWidth: 2,
    paddingBottom: 11,
    paddingHorizontal: 18,
  },
  sub: { marginTop: 2, lineHeight: 11 * 1.5 },
});
