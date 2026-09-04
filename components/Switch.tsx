import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** Track 44 × 24, knob 18 × 18, .18s travel. The only motion in the settings list. */
export function Switch({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: () => void;
  label: string;
}) {
  const { t } = useTheme();
  const travel = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(travel, {
      toValue: value ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [travel, value]);

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={onChange}
      // 44 × 24 visually, with vertical slop taking the touch target to 44 dp.
      hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      style={[
        styles.track,
        { borderColor: t.rule2, backgroundColor: value ? t.accentTint2 : 'transparent' },
      ]}
    >
      <Animated.View
        style={[
          styles.knob,
          { backgroundColor: t.ink, transform: [{ translateX: travel.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  knob: { width: 18, height: 18, borderRadius: 9 },
});
