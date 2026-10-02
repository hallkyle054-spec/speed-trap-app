import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ARRIVED_M,
  OFF_ROUTE_FIXES,
  REROUTE_GAP_MS,
  trackOffRoute,
} from '../data/reroute';
import { LatLng } from '../data/geo';

/** A straight run east along a line of latitude, so offsets are easy to reason about. */
const PATH: LatLng[] = [
  { latitude: 51.8, longitude: -4.3 },
  { latitude: 51.8, longitude: -4.2 },
  { latitude: 51.8, longitude: -4.1 },
];
const DEST = PATH[2];

/** Roughly metres north of the line, at this latitude. */
const north = (metres: number, longitude = -4.25): LatLng => ({
  latitude: 51.8 + metres / 111_320,
  longitude,
});

const run = (points: LatLng[], startAt = 0) => {
  let strayFixes = 0;
  let lastRerouteAt = startAt;
  let reroutes = 0;
  points.forEach((position, i) => {
    const out = trackOffRoute({
      position,
      path: PATH,
      destination: DEST,
      strayFixes,
      lastRerouteAt,
      now: 1_000 + i * 500,
    });
    strayFixes = out.strayFixes;
    if (out.reroute) {
      reroutes += 1;
      lastRerouteAt = 1_000 + i * 500;
    }
  });
  return reroutes;
};

test('staying on the line never asks for a new route', () => {
  assert.equal(run(Array.from({ length: 40 }, () => north(5))), 0);
});

test('one stray fix is noise, not a missed turn', () => {
  // A parallel carriageway or a moment of GPS wander must not redraw the map.
  assert.equal(run([north(5), north(300), north(5), north(300), north(5)]), 0);
});

test('a sustained departure asks for exactly one new route', () => {
  assert.equal(run(Array.from({ length: OFF_ROUTE_FIXES }, () => north(300))), 1);
});

test('staying off the line does not ask again on every fix', () => {
  // The expensive mistake: one request per fix while the driver is still lost.
  assert.equal(run(Array.from({ length: 60 }, () => north(300))), 1);
});

test('getting back on the line re-arms it', () => {
  const away = Array.from({ length: OFF_ROUTE_FIXES }, () => north(300));
  const back = Array.from({ length: 4 }, () => north(5));
  // Second departure is far enough after the first to clear the gap.
  const later = Array.from({ length: Math.ceil(REROUTE_GAP_MS / 500) + OFF_ROUTE_FIXES }, () =>
    north(300),
  );
  assert.equal(run([...away, ...back, ...later]), 2);
});

test('the gap holds a second request back rather than cancelling it', () => {
  // Below the threshold, not latched off: once the window passes it fires.
  const points = Array.from({ length: OFF_ROUTE_FIXES * 2 }, () => north(300));
  let strayFixes = 0;
  const out = points.map((position, i) =>
    trackOffRoute({
      position,
      path: PATH,
      destination: DEST,
      strayFixes: (strayFixes = trackOffRoute({
        position,
        path: PATH,
        destination: DEST,
        strayFixes,
        lastRerouteAt: 1,
        now: 1_000 + i * 100,
      }).strayFixes),
      lastRerouteAt: 1,
      now: 1_000 + i * 100,
    }),
  );
  assert.ok(out.every(o => !o.reroute), 'nothing fires inside the gap');
  assert.ok(strayFixes >= OFF_ROUTE_FIXES - 1, 'the count is held, not reset');
});

test('a driver about to arrive is not lost', () => {
  // Overshooting the destination by a street is not a navigation failure.
  const near = { latitude: DEST.latitude + (ARRIVED_M - 30) / 111_320, longitude: DEST.longitude };
  assert.equal(run(Array.from({ length: 40 }, () => near)), 0);
});

test('a route with no line to follow asks for nothing', () => {
  const out = trackOffRoute({
    position: north(500),
    path: [],
    destination: DEST,
    strayFixes: 99,
    lastRerouteAt: 0,
    now: 1,
  });
  assert.deepEqual(out, { strayFixes: 0, reroute: false });
});
