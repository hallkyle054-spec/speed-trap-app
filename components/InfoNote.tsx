import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { body } from '../theme/type';

/**
 * An explanation, folded away behind a circled i.
 *
 * These notes are worth having — several of them are the difference between a
 * control that looks arbitrary and one whose reason is obvious — but a settings
 * screen that argues with you in paragraphs before you have asked anything is a
 * screen nobody reads. So the text stays, and the asking is opt-in.
 *
 * The button carries its own label for screen readers, because a circled i on
 * its own tells a screen reader nothing about what it will explain.
 */
export function InfoNote({ about, children }: { about: string; children: React.ReactNode }) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.root}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? `Hide the note about ${about}` : `About ${about}`}
        onPress={() => setOpen(o => !o)}
        // The circle is 20dp but the target around it is 44, which is what a
        // thumb needs and what the circle would be too heavy to be.
        hitSlop={12}
        style={styles.button}
      >
        <View
          style={[
            styles.circle,
            { borderColor: open ? t.accent : t.rule2, backgroundColor: open ? t.accentTint : 'transparent' },
          ]}
        >
          <Text style={[body(11), styles.glyph, { color: open ? t.accentInk : t.ink55 }]}>i</Text>
        </View>
      </Pressable>

      {open ? (
        <Text style={[body(11), styles.note, { color: t.ink55 }]}>{children}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: 6 },
  button: { alignSelf: 'flex-start' },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Optical centring: the dot of an `i` sits high, so the glyph rides low.
  glyph: { lineHeight: 13, includeFontPadding: false },
  note: { marginTop: 7 },
});
