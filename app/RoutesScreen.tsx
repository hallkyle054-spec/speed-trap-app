import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { SavedRoute, zonesOnRoute } from '../data/routes';
import { Zone } from '../data/zones';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { body, display, heading, kicker, tnum } from '../theme/type';

type Props = {
  routes: SavedRoute[];
  zones: Zone[];
  topInset: number;
};

/** Saved commutes with a zone count for today. */
export function RoutesScreen({ routes, zones, topInset }: Props) {
  const { t } = useTheme();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: 16 + topInset, borderBottomColor: t.rule }]}>
        <Text style={[kicker(9.5, 0.14), { color: t.ink50 }]}>Saved</Text>
        <Text style={[display(31, -0.02), styles.h1, { color: t.ink }]}>Your routes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {routes.map(route => {
          const onRoute = zonesOnRoute(route, zones);
          return (
            <View key={route.id} style={[styles.card, { borderColor: t.rule }]}>
              <View style={styles.cardTop}>
                <Text style={[heading(20), { color: t.ink }]}>{route.title}</Text>
                <Text
                  style={[
                    display(26),
                    tnum,
                    { color: onRoute.length ? t.accentInk : t.ink40 },
                  ]}
                >
                  {onRoute.length}
                </Text>
              </View>
              <Text style={[body(11.5), styles.sub, { color: t.ink60 }]}>{route.sub}</Text>
              <View style={[styles.divider, { backgroundColor: t.rule }]} />
              {onRoute.length ? (
                <Text style={[body(11), styles.zoneList, { color: t.ink60 }]}>
                  {onRoute.map(z => `${z.road} ${z.name}`).join(' · ')}
                </Text>
              ) : (
                <Text style={[body(11), styles.emptyLine, { color: t.ink50 }]}>
                  Nothing published on this route today
                </Text>
              )}
            </View>
          );
        })}

        <Button
          label="Add a route"
          tone="dashed"
          onPress={() =>
            // Capturing a route needs the routing layer, which is not part of
            // this handoff — see the README's "Not built yet".
            Alert.alert(
              'Add a route',
              'Route capture needs the routing layer, which is not built yet.',
            )
          }
          style={styles.add}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1 },
  h1: { marginTop: 7, lineHeight: 31 * 1.05 },
  list: { padding: 16, paddingHorizontal: 18, gap: 14 },
  card: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 15,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sub: { marginTop: 1 },
  divider: { height: 1, marginVertical: 11 },
  zoneList: { lineHeight: 11 * 1.7 },
  emptyLine: { fontStyle: 'italic' },
  add: { paddingVertical: 10 },
});
