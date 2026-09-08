/**
 * The settings schema: what an option may be, and how a stored blob is brought
 * back to something the UI can actually represent. Kept free of React so it can
 * be tested directly — this is the code that decides whether a value read off a
 * user's disk is trustworthy.
 */

export type Theme = 'system' | 'light' | 'dark';
/**
 * `segment` is gone. The publisher gives one coordinate per zone, so there is
 * no stretch of road to draw along — the option rendered as a point no matter
 * what, which is a control that lies about having done something.
 */
export type ZoneMark = 'pin' | 'radius';
export type WarnAt = 300 | 500 | 800 | 1000;

export type Settings = {
  chime: boolean;
  voice: boolean;
  showStale: boolean;
  warnAt: WarnAt;
  mark: ZoneMark;
  theme: Theme;
  /**
   * Which unitary authorities to carry, by name. **Empty means all of them** —
   * which is also the default, and is not the same as "none". A driver who has
   * never opened the county list gets the whole country, and a county added to
   * the source later appears without anyone having to opt into it.
   */
  counties: string[];
};

export const defaultSettings: Settings = {
  chime: true,
  voice: false,
  showStale: true,
  warnAt: 800,
  /** Draws exactly what the source gives: one point per zone. */
  mark: 'pin',
  theme: 'system',
  counties: [],
};

/**
 * The allowed values for each option that is not simply a boolean. Checking the
 * type alone was not enough: any string passed for `mark` and `theme`, so a
 * value retired by a later version — or anything corrupt on disk — survived a
 * reload and left the app in a state its own UI could not represent.
 */
const ALLOWED = {
  warnAt: [300, 500, 800, 1000],
  mark: ['pin', 'radius'],
  theme: ['system', 'light', 'dark'],
} as const;

/** Drops unknown keys and anything invalid, keeping the default in its place. */
export function reconcile(raw: unknown): Settings {
  if (!raw || typeof raw !== 'object') return defaultSettings;
  const stored = raw as Record<string, unknown>;
  const out = { ...defaultSettings };

  for (const key of Object.keys(defaultSettings) as (keyof Settings)[]) {
    const value = stored[key];

    // `typeof` calls an array an object, and would have let `{}` through as a
    // county list. Arrays are checked as arrays, and their contents too.
    if (Array.isArray(defaultSettings[key])) {
      if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
        (out as Record<string, unknown>)[key] = [...new Set(value as string[])];
      }
      continue;
    }

    if (typeof value !== typeof defaultSettings[key]) continue;

    const allowed: readonly unknown[] | undefined = (ALLOWED as Record<string, readonly unknown[]>)[
      key
    ];
    if (allowed && !allowed.includes(value)) continue;

    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
