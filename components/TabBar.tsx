import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { duration, ease, usePressScale } from '../theme/motion';
import { heading } from '../theme/type';

export type TabId = 'map' | 'today' | 'routes' | 'more';

const TABS: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Map' },
  { id: 'today', label: 'Zones' },
  { id: 'routes', label: 'Routes' },
  { id: 'more', label: 'More' },
];

export const TAB_IDS = TABS.map(t => t.id);

/**
 * Four equal tabs. The active tab's 2px rule sits on top of the container's
 * hairline rather than under it, hence the -1 offset.
 *
 * The rule slides between tabs rather than jumping, which is the one piece of
 * motion here that carries information: it shows which way the screens moved.
 * It cannot be drawn as a border on the tab itself any more, so it is one bar
 * laid over the row and translated — width comes from the measured row, since
 * four equal tabs are only equal once there is a width to divide.
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
  const [width, setWidth] = useState(0);
  const slide = useRef(new Animated.Value(TAB_IDS.indexOf(tab))).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: TAB_IDS.indexOf(tab),
      duration: duration.slide,
      easing: ease,
      useNativeDriver: true,
    }).start();
  }, [slide, tab]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const slot = width / TABS.length;

  return (
    <View
      style={[
        styles.bar,
        { borderTopColor: t.rule, backgroundColor: t.bg, paddingBottom: bottomInset },
      ]}
      onLayout={onLayout}
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.rule,
            {
              width: slot,
              backgroundColor: t.accent,
              transform: [
                {
                  translateX: slide.interpolate({
                    inputRange: [0, TABS.length - 1],
                    outputRange: [0, slot * (TABS.length - 1)],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {TABS.map(({ id, label }) => (
        <Tab
          key={id}
          label={label}
          active={id === tab}
          onPress={() => onChange(id)}
        />
      ))}
    </View>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const press = usePressScale(0.94);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={styles.tab}
    >
      <Animated.View style={press.style}>
        <Text style={[heading(13.5, 0.04), { color: active ? t.accentInk : t.ink45 }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: 1 },
  rule: { position: 'absolute', top: -1, left: 0, height: 2 },
  tab: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    paddingTop: 11,
    paddingBottom: 13,
    alignItems: 'center',
    marginTop: -1,
  },
});
