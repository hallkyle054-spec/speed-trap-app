import { Animated, Easing } from 'react-native';
import { useCallback, useRef } from 'react';

/**
 * The app's motion, in one place.
 *
 * The rule throughout is that motion confirms something rather than performs:
 * a press should feel answered, a screen should arrive from the direction you
 * asked for it. Nothing here is longer than a fifth of a second, because this
 * is an app read at a glance with one hand on a wheel, and an animation a
 * driver has to wait out is worse than none.
 *
 * Everything animates `transform` or `opacity` only, so it can all run on the
 * native driver and keep moving while JavaScript is busy — which, on a map
 * holding seven hundred marks, it frequently is.
 */

export const duration = {
  /** A press answering. */
  press: 110,
  /** A screen arriving. */
  screen: 190,
  /** A rule sliding between tabs. */
  slide: 220,
} as const;

/** Decelerating: quick to start, settling at the end. Nothing eases in. */
export const ease = Easing.out(Easing.cubic);

/** How far a screen travels as it arrives. Enough to read a direction from. */
export const SCREEN_TRAVEL = 14;

/**
 * A press that answers by shrinking very slightly.
 *
 * 0.97 is deliberately small — at this size the control does not appear to
 * move so much as to acknowledge, which is what a button on a dashboard should
 * do. The release spring is slightly slower than the press so it does not snap.
 */
export function usePressScale(to = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: to,
      duration: duration.press,
      easing: ease,
      useNativeDriver: true,
    }).start();
  }, [scale, to]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      speed: 20,
      bounciness: 6,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return { onPressIn, onPressOut, style: { transform: [{ scale }] } };
}
