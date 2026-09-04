import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayLabel, shortDayLabel } from '../data/dates';
import {
  Zone,
  fixtureZones,
  hoursLabel,
  isStale,
  limitLabel,
  nearestZone,
  phaseOf,
  rowNote,
  shortDate,
  statusLabel,
  FALLBACK_ORIGIN,
} from '../data/zones';

const at = (hh: number, mm = 0) => {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
};

const daysAgo = (n: number) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const zone = (over: Partial<Zone> = {}): Zone => ({
  id: 'test',
  road: 'A484',
  name: 'Llangain → Bancyfelin',
  window: { from: '08:00', to: '13:00' },
  limitMph: 60,
  note: 'note',
  lastPublished: daysAgo(0),
  path: [
    { latitude: 51.7817, longitude: -4.3486 },
    { latitude: 51.818, longitude: -4.42 },
  ],
  ...over,
});

test('a zone is active only inside its published window', () => {
  assert.equal(phaseOf(zone(), at(7, 59)), 'upcoming');
  assert.equal(phaseOf(zone(), at(8, 0)), 'active');
  assert.equal(phaseOf(zone(), at(12, 59)), 'active');
  // The window is half-open: at the closing time it has ended.
  assert.equal(phaseOf(zone(), at(13, 0)), 'ended');
  assert.equal(phaseOf(zone(), at(19, 0)), 'ended');
});

test('a zone with no window today never reads as active', () => {
  assert.equal(phaseOf(zone({ window: null }), at(10)), 'ended');
  assert.equal(hoursLabel(zone({ window: null })), 'not today');
});

test('staleness turns over after seven days and outranks the window', () => {
  assert.equal(isStale(zone({ lastPublished: daysAgo(7) }), at(10)), false);
  assert.equal(isStale(zone({ lastPublished: daysAgo(8) }), at(10)), true);
  // Inside its window, but not republished in a week — stale wins.
  assert.equal(phaseOf(zone({ lastPublished: daysAgo(9) }), at(10)), 'stale');
});

test('an unparseable publish date is treated as stale rather than trusted', () => {
  assert.equal(isStale(zone({ lastPublished: 'not-a-date' }), at(10)), true);
});

test('every phase carries the "not confirmed" disclaimer or the stale stamp', () => {
  assert.equal(rowNote(zone(), 'active'), 'Published zone · camera not confirmed');
  assert.equal(rowNote(zone(), 'upcoming'), 'Scheduled later today · camera not confirmed');
  assert.equal(rowNote(zone(), 'ended'), 'Published earlier today · camera not confirmed');
  assert.match(rowNote(zone({ lastPublished: '2026-08-28' }), 'stale'), /^Stale — last published 28 Aug$/);
});

test('no status label ever claims a camera is present', () => {
  for (const phase of ['active', 'upcoming', 'ended', 'stale'] as const) {
    assert.doesNotMatch(statusLabel(phase), /confirmed|camera|van/i);
    assert.doesNotMatch(rowNote(zone(), phase), /camera confirmed|camera present/i);
  }
});

test('hours and limit render as the design writes them', () => {
  assert.equal(hoursLabel(zone()), '08:00–13:00');
  assert.equal(limitLabel(zone()), '60 mph');
});

test('the fallback origin puts the A484 zone nearest, as the design shows', () => {
  const nearest = nearestZone(fixtureZones, FALLBACK_ORIGIN);
  assert.equal(nearest?.road, 'A484');
});

test('nearestZone returns null for an empty list', () => {
  assert.equal(nearestZone([], FALLBACK_ORIGIN), null);
});

test('the fixture keeps the six zones from the handoff', () => {
  assert.deepEqual(
    fixtureZones.map(z => z.road),
    ['A484', 'A40', 'A48', 'A483', 'A4069', 'B4300'],
  );
  // B4300 Golden Grove is the stale one, and it is the only stale one.
  const stale = fixtureZones.filter(z => isStale(z, new Date()));
  assert.deepEqual(stale.map(z => z.road), ['B4300']);
});

test('date labels match the design exactly, not the locale default', () => {
  // en-GB renders this as 'Fri, 4 Sept' on some ICU builds; the design says 'Fri 4 Sep'.
  assert.equal(dayLabel(new Date(2026, 8, 4)), 'Fri 4 Sep');
  assert.equal(dayLabel(new Date(2026, 0, 1)), 'Thu 1 Jan');
  assert.equal(shortDayLabel(new Date(2026, 7, 28)), '28 Aug');
  assert.equal(shortDate('2026-08-28'), '28 Aug');
  assert.equal(shortDate('nonsense'), 'unknown');
});
