/**
 * Date labels are written out rather than taken from `toLocaleDateString`.
 * The design specifies `Fri 4 Sep`; en-GB renders that as `Fri, 4 Sept` on
 * some ICU builds, and the exact string is part of the design.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** 'Fri 4 Sep' — the header kicker and the offline banner. */
export const dayLabel = (d: Date) =>
  `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** '28 Aug' — the stale stamp. */
export const shortDayLabel = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;

/** '22:05' — a 24-hour clock, zero-padded so the column does not jitter. */
export const clockLabel = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/**
 * '8 Oct, 22:05' — when the list on screen was fetched.
 *
 * The time on its own was ambiguous in the one case that matters: a list
 * fetched at 22:05 yesterday and one fetched at 22:05 today read identically,
 * and telling a driver how current their list is is the whole point of the line.
 */
export const stampLabel = (d: Date) => `${shortDayLabel(d)}, ${clockLabel(d)}`;
