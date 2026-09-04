import assert from 'node:assert/strict';
import { test } from 'node:test';

import { REARM_FACTOR, updateAlerts } from '../data/alerts';
import { Zone } from '../data/zones';

const at = (id: string, latitude: number, longitude = -4.3): Zone => ({
  id,
  road: id,
  name: id,
  limitMph: 20,
  note: '',
  firstListed: '2026-01-01',
  lastListed: '2026-09-04',
  path: [{ latitude, longitude }],
});

// ~111 m per 0.001 degrees of latitude.
const NORTH_OF = (metres: number) => 51.8 + metres / 111_320;

const run = (zones: Zone[], metres: number, alerted: Set<string>, warnAt = 800) =>
  updateAlerts({ zones, origin: { latitude: NORTH_OF(metres), longitude: -4.3 }, warnAt, alerted });

test('a site inside the warn distance chimes once, not on every fix', () => {
  const zones = [at('a', 51.8)];
  const first = run(zones, 500, new Set());
  assert.deepEqual(first.toChime.map(z => z.id), ['a']);

  const second = run(zones, 400, first.alerted);
  assert.deepEqual(second.toChime, []);
});

test('a site outside the warn distance does not chime', () => {
  assert.deepEqual(run([at('a', 51.8)], 1200, new Set()).toChime, []);
});

test('the chime never depends on the driver being over the limit', () => {
  // Nothing in the signature can express speed, so it cannot be suppressed by it.
  const zones = [at('a', 51.8)];
  assert.deepEqual(run(zones, 300, new Set()).toChime.map(z => z.id), ['a']);
});

test('every distinct site approached gets its own chime', () => {
  const zones = [at('a', 51.8), at('b', NORTH_OF(600))];
  const { toChime } = run(zones, 300, new Set());
  assert.deepEqual(toChime.map(z => z.id).sort(), ['a', 'b']);
});

test('a site re-arms only once well clear, so idling near it stays quiet', () => {
  const zones = [at('a', 51.8)];
  const chimed = run(zones, 500, new Set()).alerted;

  // Just past the warn distance: still considered done, no repeat.
  const nudged = run(zones, 900, chimed);
  assert.ok(nudged.alerted.has('a'));
  assert.deepEqual(nudged.toChime, []);

  // Comfortably clear: re-armed, and chimes again on the next approach.
  const cleared = run(zones, 800 * REARM_FACTOR + 200, nudged.alerted);
  assert.ok(!cleared.alerted.has('a'));
  assert.deepEqual(run(zones, 400, cleared.alerted).toChime.map(z => z.id), ['a']);
});

test('the nearest site is reported so the display can follow the drive', () => {
  const zones = [at('far', 51.9), at('near', NORTH_OF(200))];
  const { nearest, distance } = run(zones, 0, new Set());
  assert.equal(nearest?.id, 'near');
  assert.ok(Math.abs(distance - 200) < 15, `expected ~200 m, got ${distance.toFixed(0)}`);
});

test('an empty list yields nothing to show and nothing to chime', () => {
  const { nearest, toChime } = run([], 0, new Set());
  assert.equal(nearest, null);
  assert.deepEqual(toChime, []);
});
