import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
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
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.cell,
              {
                backgroundColor: selected ? t.accentTint2 : 'transparent',
                borderRightWidth: index === options.length - 1 ? 0 : 1,
                borderRightColor: t.rule,
              },
            ]}
          >
            <Text
              style={[
                heading(14),
                figures ? tnum : null,
                { color: selected ? t.accentInk : t.ink60 },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, overflow: 'hidden' },
  cell: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
});
