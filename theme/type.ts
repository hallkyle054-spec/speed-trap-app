import { TextStyle } from 'react-native';

/**
 * One family, three weights.
 *
 * The design this grew from paired Cormorant Garamond with Lora — a display
 * serif for every figure and a book serif for everything else. It read as a
 * magazine rather than an instrument, and an instrument is what this is: a
 * number glanced at through a windscreen, on a four-inch panel, at speed.
 *
 * IBM Plex Sans instead. It is a working typeface rather than a decorative
 * one — drawn for interfaces and technical documents, with figures that stay
 * unambiguous small and stay solid large. Weight carries the hierarchy, so
 * nothing has to change family to change emphasis, and the widget, the cover
 * screen and the phone can all be set in the same thing.
 *
 * The names are the font *file* stems on purpose: the app loads them under
 * these names and the widget matches its bundled assets by the same prefix, so
 * the two cannot drift apart.
 */
export const font = {
  /** Large figures and screen titles. */
  display: 'IBMPlexSans_500Medium',
  /** Interface headings, buttons, tab labels. */
  heading: 'IBMPlexSans_600SemiBold',
  /** Body copy, sub-labels, map labels. */
  body: 'IBMPlexSans_400Regular',
  /** Emphasis inside body copy. */
  bodySemi: 'IBMPlexSans_600SemiBold',
} as const;

/** CSS letter-spacing is authored in `em`; React Native wants absolute units. */
export const em = (value: number, fontSize: number) => value * fontSize;

/** Medium — display sizes and the large figures. */
export const display = (fontSize: number, letterSpacingEm = 0): TextStyle => ({
  fontFamily: font.display,
  fontSize,
  letterSpacing: em(letterSpacingEm, fontSize),
});

/** SemiBold — interface headings, buttons, tab labels. */
export const heading = (fontSize: number, letterSpacingEm = 0): TextStyle => ({
  fontFamily: font.heading,
  fontSize,
  letterSpacing: em(letterSpacingEm, fontSize),
});

/** Regular — body copy, sub-labels, map labels. */
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
 * Tabular figures — apply anywhere a column of numbers has to line up, or a
 * changing number should not shift the text beside it.
 *
 * Plex draws lining figures by default, so unlike the serif this replaced there
 * is nothing to correct: a 1 is a 1 rather than something the eye reads as a
 * small capital I. Only the tabular advance is asked for.
 */
export const tnum: TextStyle = { fontVariant: ['tabular-nums'] };
