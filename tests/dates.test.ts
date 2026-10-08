import assert from 'node:assert/strict';
import { test } from 'node:test';

import { clockLabel, dayLabel, shortDayLabel, stampLabel } from '../data/dates';

// Local time, deliberately: these labels are read on a phone in Wales, and
// building the date from parts is what keeps the day from shifting at UTC.
const at = (y: number, m: number, d: number, h = 0, min = 0) => new Date(y, m - 1, d, h, min);

test('the fetched stamp carries the date as well as the time', () => {
  // The case that made this necessary: same clock, different day.
  assert.equal(stampLabel(at(2026, 10, 8, 22, 5)), '8 Oct, 22:05');
  assert.equal(stampLabel(at(2026, 10, 7, 22, 5)), '7 Oct, 22:05');
  assert.notEqual(stampLabel(at(2026, 10, 8, 22, 5)), stampLabel(at(2026, 10, 7, 22, 5)));
});

test('the clock is zero-padded so a column of them does not jitter', () => {
  assert.equal(clockLabel(at(2026, 10, 8, 6, 4)), '06:04');
  assert.equal(clockLabel(at(2026, 10, 8, 0, 0)), '00:00');
  assert.equal(clockLabel(at(2026, 10, 8, 23, 59)), '23:59');
});

test('the written-out labels do not depend on the device locale', () => {
  // `toLocaleDateString` renders September as 'Sept' on some ICU builds; the
  // exact string is part of the design, so the months are spelled here.
  assert.equal(dayLabel(at(2026, 9, 4)), 'Fri 4 Sep');
  assert.equal(shortDayLabel(at(2026, 8, 28)), '28 Aug');
});
