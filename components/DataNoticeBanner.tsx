import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { body, heading } from '../theme/type';

/**
 * Says something about the data on screen that the driver needs to know before
 * trusting it: that it is invented, or that it has gone stale. This is the one
 * place the app is allowed to shout, so it appears only when it must.
 */
export function DataNoticeBanner({
  title,
  body: message,
  topInset,
}: {
  title: string;
  body: string;
  topInset: number;
}) {
  const { t } = useTheme();

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: t.bg, borderBottomColor: t.accent, paddingTop: 11 + topInset },
      ]}
    >
      <Text style={[heading(15), { color: t.accentInk }]}>{title}</Text>
      <Text style={[body(11), styles.sub, { color: t.ink60 }]}>{message}</Text>
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
