import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { usePressScale } from '../theme/motion';
import { heading, tnum } from '../theme/type';

export type SegmentedOption<T> = { value: T; label: string };

/**
 * One row of equal buttons inside a single hairline. The selected cell takes a
 * tint, never a solid fill — colour is stroke in this system.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  figures = false,
  label,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Set for numeric options so the figures stay tabular. */
  figures?: boolean;
  label: string;
}) {
  const { t } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.row, { borderColor: t.rule2 }]}
    >
      {options.map((option, index) => (
        <Cell
          key={String(option.value)}
          label={option.label}
          selected={option.value === value}
          last={index === options.length - 1}
          figures={figures}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

/**
 * One cell. Split out so each can hold its own press animation — a hook cannot
 * be called inside the map that used to build these inline.
 */
function Cell({
  label,
  selected,
  last,
  figures,
  onPress,
}: {
  label: string;
  selected: boolean;
  last: boolean;
  figures: boolean;
  onPress: () => void;
}) {
  const { t } = useTheme();
  const press = usePressScale(0.95);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={[
        styles.cell,
        {
          backgroundColor: selected ? t.accentTint2 : 'transparent',
          borderRightWidth: last ? 0 : 1,
          borderRightColor: t.rule,
        },
      ]}
    >
      <Animated.View style={press.style}>
        <Text
          style={[heading(14), figures ? tnum : null, { color: selected ? t.accentInk : t.ink60 }]}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  cell: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
