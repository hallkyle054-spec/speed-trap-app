/**
 * Semantic theme tokens.
 *
 * Every colour in the UI comes from this table and nothing else — see the
 * handoff's "Design tokens" section. The raw Classical palette the pairs are
 * derived from is kept in `classical` below for reference only; do not reach
 * for it directly from a screen.
 */

export const classical = {
  bg: '#f3f2f2',
  surface: '#eae9e9',
  text: '#201f1d',
  accent: '#b68235',
  neutral: [
    '#f8f4f4', '#eae7e7', '#d7d3d3', '#bab6b6', '#9b9797',
    '#7d7979', '#605d5d', '#444141', '#2d2b2b',
  ],
  accents: [
    '#fff3e4', '#ffe3bf', '#facb8d', '#e1ad66', '#c28d41',
    '#a06f24', '#7d5411', '#5a3b0a', '#3a270d',
  ],
} as const;

export type Tokens = {
  bg: string;
  plate: string;
  sea: string;
  ink: string;
  ink80: string;
  ink70: string;
  ink60: string;
  ink55: string;
  ink50: string;
  ink45: string;
  ink40: string;
  mapLabel: string;
  road: string;
  rule: string;
  rule2: string;
  rule3: string;
  scrim: string;
  tintN: string;
  hover: string;
  accent: string;
  accentInk: string;
  accentTint: string;
  accentTint2: string;
  mark: string;
  /**
   * A route that is not being kept — set against the accent rather than a
   * shade of it, because "this one is temporary" is a different fact about a
   * route, not a weaker version of the same one.
   */
  tempRoute: string;
  legendBg: string;
  shadow: string;
};

export const light: Tokens = {
  bg: '#f3f2f2',
  plate: '#f8f4f4',
  sea: '#e2e0dc',
  ink: '#201f1d',
  ink80: 'rgba(32,31,29,0.82)',
  ink70: 'rgba(32,31,29,0.7)',
  ink60: 'rgba(32,31,29,0.6)',
  ink55: 'rgba(32,31,29,0.55)',
  ink50: 'rgba(32,31,29,0.5)',
  ink45: 'rgba(32,31,29,0.45)',
  ink40: 'rgba(32,31,29,0.4)',
  mapLabel: 'rgba(32,31,29,0.78)',
  road: 'rgba(32,31,29,0.34)',
  rule: 'rgba(32,31,29,0.16)',
  rule2: 'rgba(32,31,29,0.3)',
  rule3: 'rgba(32,31,29,0.22)',
  scrim: 'rgba(32,31,29,0.34)',
  tintN: 'rgba(32,31,29,0.09)',
  hover: 'rgba(182,130,53,0.06)',
  accent: '#b68235',
  accentInk: '#7d5411',
  accentTint: 'rgba(182,130,53,0.09)',
  accentTint2: 'rgba(182,130,53,0.14)',
  mark: '#a06f24',
  tempRoute: '#6d4d9c',
  legendBg: 'rgba(243,242,242,0.9)',
  shadow: 'rgba(45,43,43,0.18)',
};

export const dark: Tokens = {
  bg: '#201f1d',
  plate: '#2d2b2b',
  sea: '#2b2928',
  ink: '#f3f2f2',
  ink80: 'rgba(243,242,242,0.8)',
  ink70: 'rgba(243,242,242,0.7)',
  ink60: 'rgba(243,242,242,0.6)',
  ink55: 'rgba(243,242,242,0.55)',
  ink50: 'rgba(243,242,242,0.5)',
  ink45: 'rgba(243,242,242,0.45)',
  ink40: 'rgba(243,242,242,0.4)',
  mapLabel: 'rgba(243,242,242,0.72)',
  road: 'rgba(243,242,242,0.34)',
  rule: 'rgba(243,242,242,0.2)',
  rule2: 'rgba(243,242,242,0.3)',
  rule3: 'rgba(243,242,242,0.22)',
  scrim: 'rgba(0,0,0,0.55)',
  tintN: 'rgba(243,242,242,0.12)',
  hover: 'rgba(225,173,102,0.08)',
  accent: '#e1ad66',
  accentInk: '#e1ad66',
  accentTint: 'rgba(225,173,102,0.14)',
  accentTint2: 'rgba(225,173,102,0.2)',
  mark: '#e1ad66',
  tempRoute: '#b79ce0',
  legendBg: 'rgba(32,31,29,0.9)',
  shadow: 'rgba(0,0,0,0.4)',
};

/** 4.6 · 9.2 · 13.8 · 18.4 · 27.6 · 36.8 */
export const space = [4.6, 9.2, 13.8, 18.4, 27.6, 36.8] as const;

/** Cards, buttons and controls take 4; the bottom sheet's top corners take 7. */
export const radius = { sm: 2, md: 4, lg: 7 } as const;
