import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { SCREEN_TRAVEL, duration, ease } from '../theme/motion';

/**
 * The screen arriving when a tab changes.
 *
 * Enter only, deliberately. Cross-fading would mean holding both screens
 * mounted through the transition, and one of them carries seven hundred map
 * marks — paying that to dissolve something already on its way out is a bad
 * trade on a phone. The incoming screen slides from the side it was asked for,
 * which is all the direction anyone reads.
 */
export function ScreenTransition({
  token,
  direction,
  children,
}: {
  /** Changes when a different screen is shown. */
  token: string;
  /** +1 when moving right through the tabs, -1 when moving left. */
  direction: number;
  children: React.ReactNode;
}) {
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: duration.screen,
      easing: ease,
      useNativeDriver: true,
    }).start();
    // Only the token restarts it. `direction` is already correct by the time
    // this runs — it is set in the same event as the tab, so React renders both
    // together — and listing it here would replay the screen if it ever changed
    // on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, progress]);

  return (
    <Animated.View
      style={[
        styles.fill,
        {
          opacity: progress,
          transform: [
            {
              // Read from the prop, not a ref written in the effect: the effect
              // runs after this render, so a ref would hold the previous
              // direction and every screen would arrive from the wrong side.
              translateX: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [direction * SCREEN_TRAVEL, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
