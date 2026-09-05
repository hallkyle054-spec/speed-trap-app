import { TextStyle } from 'react-native';

/**
 * Type rules restated from the design system:
 *  - Cormorant Garamond for headings and all figures; Lora for body and map labels.
 *  - Bold is never used. Interface headings cap at 600; display sizes (33px+) set at 400.
 *  - Figures are tabular wherever they stand as numbers. Running prose keeps default figures.
 */

export const font = {
  display: 'CormorantGaramond_400Regular',
  heading: 'CormorantGaramond_600SemiBold',
  body: 'Lora_400Regular',
  bodySemi: 'Lora_600SemiBold',
  bodyItalic: 'Lora_400Regular_Italic',
} as const;

/** CSS letter-spacing is authored in `em`; React Native wants absolute units. */
export const em = (value: number, fontSize: number) => value * fontSize;

/** Cormorant at 400 — display sizes and the large figures. */
export const display = (fontSize: number, letterSpacingEm = 0): TextStyle => ({
  fontFamily: font.display,
  fontSize,
  letterSpacing: em(letterSpacingEm, fontSize),
});

/** Cormorant at 600 — interface headings, buttons, tab labels. */
export const heading = (fontSize: number, letterSpacingEm = 0): TextStyle => ({
  fontFamily: font.heading,
  fontSize,
  letterSpacing: em(letterSpacingEm, fontSize),
});

/** Lora — body copy, sub-labels, map labels. */
export const body = (fontSize: number, letterSpacingEm = 0): TextStyle => ({
  fontFamily: font.body,
  fontSize,
  letterSpacing: em(letterSpacingEm, fontSize),
});

/**
 * Uppercase kicker. 9.5px is the smallest size used anywhere in the app and is
 * reserved for these.
 */
export const kicker = (fontSize: number, letterSpacingEm: number): TextStyle => ({
  ...body(fontSize, letterSpacingEm),
  textTransform: 'uppercase',
});

/**
 * Tabular *lining* figures — apply anywhere a number stands as a number.
 *
 * Cormorant defaults to oldstyle figures, where 1 is a short glyph all but
 * indistinguishable from a small capital I. A route's zone count reading as
 * "I" is not a stylistic quibble, so numbers that carry meaning are set lining.
 */
export const tnum: TextStyle = { fontVariant: ['lining-nums', 'tabular-nums'] };
