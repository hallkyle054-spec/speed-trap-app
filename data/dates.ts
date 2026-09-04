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
