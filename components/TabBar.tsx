import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { heading } from '../theme/type';

export type TabId = 'map' | 'today' | 'routes' | 'alerts';

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'today', label: 'Sites' },
  { id: 'routes', label: 'Routes' },
  { id: 'alerts', label: 'Alerts' },
];

/**
 * Four equal tabs. The active tab's 2px rule sits on top of the container's
 * hairline rather than under it, hence the -1 offset.
 */
export function TabBar({
  tab,
  onChange,
  bottomInset,
}: {
  tab: TabId;
  onChange: (tab: TabId) => void;
  bottomInset: number;
}) {
  const { t } = useTheme();

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: t.rule, backgroundColor: t.bg, paddingBottom: bottomInset },
      ]}
    >
      {TABS.map(({ id, label }) => {
        const active = id === tab;
        return (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(id)}
            style={[styles.tab, { borderTopColor: active ? t.accent : 'transparent' }]}
          >
            <Text style={[heading(13.5, 0.04), { color: active ? t.accentInk : t.ink45 }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  tab: {
    flex: 1,
    paddingTop: 11,
    paddingBottom: 13,
    alignItems: 'center',
    borderTopWidth: 2,
    marginTop: -1,
  },
});
