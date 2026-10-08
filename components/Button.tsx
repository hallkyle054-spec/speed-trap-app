import React from 'react';
import {
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { radius } from '../theme/tokens';
import { usePressScale } from '../theme/motion';
import { heading } from '../theme/type';

/**
 * Colour is applied as stroke, not fill — every button in the app is an
 * outline. `accent` marks the primary action, `quiet` the secondary one,
 * `dashed` the add affordance.
 */
export type ButtonTone = 'accent' | 'quiet' | 'dashed';

export function Button({
  label,
  onPress,
  tone = 'accent',
  size = 14,
  letterSpacingEm = 0,
  style,
  textStyle,
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: ButtonTone;
  size?: number;
  letterSpacingEm?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
}) {
  const { t } = useTheme();
  const press = usePressScale();
  const border = tone === 'accent' ? t.accent : t.rule2;
  const color = tone === 'accent' ? t.accentInk : tone === 'dashed' ? t.ink60 : t.ink70;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      // A disabled button must not answer a press it is going to ignore.
      onPressIn={disabled ? undefined : press.onPressIn}
      onPressOut={disabled ? undefined : press.onPressOut}
      style={({ pressed }) => [
        styles.base,
        {
          borderColor: border,
          borderStyle: tone === 'dashed' ? 'dashed' : 'solid',
          // The prototype's hover state; on touch it reads as the press state.
          backgroundColor: pressed && tone === 'accent' ? t.accentTint : 'transparent',
          opacity: pressed && tone !== 'accent' ? 0.65 : 1,
        },
        press.style,
        style,
      ]}
    >
      <Text style={[heading(size, letterSpacingEm), { color }, textStyle]}>{label}</Text>
    </AnimatedPressable>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
