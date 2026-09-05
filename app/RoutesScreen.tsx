import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AddRouteSheet } from '../components/AddRouteSheet';
import { Button } from '../components/Button';
import { SavedRoute, zonesOnRoute } from '../data/routes';
import { Zone } from '../data/zones';
import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { body, display, heading, kicker, tnum } from '../theme/type';

type Props = {
  routes: SavedRoute[];
  zones: Zone[];
  onAdd: (route: SavedRoute) => void;
  onRemove: (id: string) => void;
  topInset: number;
};

/** Saved commutes with a zone count for today. */
export function RoutesScreen({ routes, zones, onAdd, onRemove, topInset }: Props) {
  const { t } = useTheme();
  const [adding, setAdding] = useState(false);

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
            <Pressable
              key={route.id}
              onLongPress={() =>
                Alert.alert('Remove route', `Remove “${route.title}”?`, [
                  { text: 'Keep', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => onRemove(route.id) },
                ])
              }
              style={[styles.card, { borderColor: t.rule }]}
            >
              <View style={styles.cardTop}>
                <Text numberOfLines={2} style={[heading(20), styles.cardTitle, { color: t.ink }]}>
                  {route.title}
                </Text>
                <Text
                  style={[
                    display(26),
                    tnum,
                    styles.cardCount,
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
            </Pressable>
          );
        })}

        <Button
          label="Add a route"
          tone="dashed"
          onPress={() => setAdding(true)}
          style={styles.add}
        />

        <Text style={[body(11), styles.hint, { color: t.ink50 }]}>
          Press and hold a route to remove it.
        </Text>
      </ScrollView>

      <AddRouteSheet visible={adding} onClose={() => setAdding(false)} onSave={onAdd} />
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  cardTitle: { flexShrink: 1 },
  cardCount: { flexShrink: 0 },
  sub: { marginTop: 1 },
  divider: { height: 1, marginVertical: 11 },
  zoneList: { lineHeight: 11 * 1.7 },
  emptyLine: { fontStyle: 'italic' },
  add: { minHeight: 48 },
  hint: { textAlign: 'center', marginTop: 2 },
});
