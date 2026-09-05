import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dayLabel, shortDayLabel } from '../data/dates';
import { reconcile } from '../state/settingsSchema';
import {
  FALLBACK_ORIGIN,
  Zone,
  daysSinceListed,
  fixtureZones,
  latestListing,
  limitLabel,
  listedSince,
  nearestZone,
  rowNote,
  shortDate,
  statusLabel,
  statusOf,
} from '../data/zones';

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
  limitMph: 60,
  note: 'note',
  firstListed: daysAgo(90),
  lastListed: daysAgo(0),
  path: [
    { latitude: 51.7817, longitude: -4.3486 },
    { latitude: 51.818, longitude: -4.42 },
  ],
  ...over,
});

test('a site is listed while it is on the newest list we hold', () => {
  const latest = daysAgo(0);
  assert.equal(statusOf(zone(), latest), 'listed');
  assert.equal(statusOf(zone({ lastListed: daysAgo(1) }), latest), 'removed');
  assert.equal(statusOf(zone({ lastListed: daysAgo(60) }), latest), 'removed');
});

test('with no list date at all nothing is wrongly marked removed', () => {
  assert.equal(statusOf(zone(), null), 'listed');
});

test('latestListing picks the newest date across the list', () => {
  assert.equal(
    latestListing([zone({ lastListed: daysAgo(9) }), zone({ lastListed: daysAgo(2) })]),
    daysAgo(2),
  );
  assert.equal(latestListing([]), null);
  assert.equal(latestListing([zone({ lastListed: 'rubbish' })]), null);
});

test('the model carries no enforcement window, because the source publishes none', () => {
  // A regression guard: re-introducing hours would put times on screen that
  // nothing in the published data supports.
  assert.ok(!('window' in zone()));
  assert.ok(!('hours' in zone()));
  for (const z of fixtureZones) {
    assert.ok(!('window' in z));
  }
});

test('an unpublished speed limit says so rather than guessing', () => {
  assert.equal(limitLabel(zone({ limitMph: null })), 'Not published');
  assert.equal(limitLabel(zone({ limitMph: 30 })), '30 mph');
});

test('every note and status keeps the disclaimer and never claims a camera', () => {
  assert.match(rowNote(zone(), 'listed'), /camera not confirmed$/);
  assert.match(rowNote(zone({ lastListed: '2026-08-27' }), 'removed'), /camera not confirmed$/);
  for (const status of ['listed', 'removed'] as const) {
    assert.doesNotMatch(statusLabel(status), /camera|van|confirmed/i);
    assert.doesNotMatch(rowNote(zone(), status), /camera confirmed|camera present/i);
  }
});

test('dates render as the design writes them, not as the locale would', () => {
  assert.equal(dayLabel(new Date(2026, 8, 4)), 'Fri 4 Sep');
  assert.equal(shortDayLabel(new Date(2026, 7, 28)), '28 Aug');
  assert.equal(shortDate('2026-08-28'), '28 Aug');
  assert.equal(shortDate('nonsense'), 'unknown');
  assert.equal(listedSince(zone({ firstListed: '2026-08-12' })), '12 Aug');
});

test('daysSinceListed counts calendar days and copes with a bad date', () => {
  const now = new Date();
  assert.equal(daysSinceListed(zone({ lastListed: daysAgo(0) }), now), 0);
  assert.equal(daysSinceListed(zone({ lastListed: daysAgo(21) }), now), 21);
  assert.equal(daysSinceListed(zone({ lastListed: 'nope' }), now), Number.POSITIVE_INFINITY);
});

test('the fallback origin puts the A484 site nearest, as the design shows', () => {
  assert.equal(nearestZone(fixtureZones, FALLBACK_ORIGIN)?.road, 'A484');
  assert.equal(nearestZone([], FALLBACK_ORIGIN), null);
});

test('the fixture keeps the six sites, one of them removed', () => {
  assert.deepEqual(
    fixtureZones.map(z => z.road),
    ['A484', 'A40', 'A48', 'A483', 'A4069', 'B4300'],
  );
  const latest = latestListing(fixtureZones);
  const removed = fixtureZones.filter(z => statusOf(z, latest) === 'removed');
  assert.deepEqual(removed.map(z => z.road), ['B4300']);
});

test('a retired or corrupt stored setting falls back rather than sticking', () => {
  // 'segment' was a real option once; a stored copy must not survive its removal.
  assert.equal(reconcile({ mark: 'segment' }).mark, 'pin');
  assert.equal(reconcile({ mark: 'banana' }).mark, 'pin');
  assert.equal(reconcile({ theme: 'neon' }).theme, 'system');
  assert.equal(reconcile({ warnAt: 12345 }).warnAt, 800);
  // Valid values still come through.
  assert.equal(reconcile({ mark: 'radius' }).mark, 'radius');
  assert.equal(reconcile({ warnAt: 300, theme: 'dark' }).warnAt, 300);
  assert.equal(reconcile({ chime: false }).chime, false);
  assert.equal(reconcile(null).mark, 'pin');
});
