import assert from 'node:assert/strict';
import { test } from 'node:test';

import { distanceToPath, formatDistance, haversine, metresPerSecondToMph, pathLength } from '../data/geo';

const carmarthen = { latitude: 51.8558, longitude: -4.311 };
const llanelli = { latitude: 51.68, longitude: -4.16 };

test('haversine matches the known Carmarthen → Llanelli separation', () => {
  const km = haversine(carmarthen, llanelli) / 1000;
  assert.ok(km > 22 && km < 24, `expected ~23 km, got ${km.toFixed(2)}`);
});

test('haversine is zero for a point against itself', () => {
  assert.equal(Math.round(haversine(carmarthen, carmarthen)), 0);
});

test('distanceToPath measures to the nearest point on the segment, not to a vertex', () => {
  const path = [
    { latitude: 51.8, longitude: -4.4 },
    { latitude: 51.8, longitude: -4.2 },
  ];
  // Due north of the middle of the segment.
  const point = { latitude: 51.81, longitude: -4.3 };
  const toPath = distanceToPath(point, path);
  const toNearestVertex = Math.min(haversine(point, path[0]), haversine(point, path[1]));
  assert.ok(toPath < toNearestVertex);
  assert.ok(Math.abs(toPath - 1112) < 40, `expected ~1112 m, got ${toPath.toFixed(0)}`);
});

test('distanceToPath clamps to the segment ends rather than extending the line', () => {
  const path = [
    { latitude: 51.8, longitude: -4.4 },
    { latitude: 51.8, longitude: -4.2 },
  ];
  const beyond = { latitude: 51.8, longitude: -4.1 };
  assert.ok(Math.abs(distanceToPath(beyond, path) - haversine(beyond, path[1])) < 1);
});

test('distanceToPath handles a single-point path', () => {
  const path = [carmarthen];
  assert.ok(Math.abs(distanceToPath(llanelli, path) - haversine(llanelli, carmarthen)) < 1);
});

test('pathLength sums the legs', () => {
  const path = [carmarthen, { latitude: 51.77, longitude: -4.25 }, llanelli];
  const expected = haversine(path[0], path[1]) + haversine(path[1], path[2]);
  assert.ok(Math.abs(pathLength(path) - expected) < 1);
});

test('formatDistance switches to one decimal km at a kilometre', () => {
  assert.equal(formatDistance(0), '0 m');
  assert.equal(formatDistance(840), '840 m');
  assert.equal(formatDistance(999.4), '999 m');
  assert.equal(formatDistance(1000), '1.0 km');
  assert.equal(formatDistance(2412), '2.4 km');
  assert.equal(formatDistance(Number.POSITIVE_INFINITY), '—');
});

test('speed converts m/s to whole mph and never goes negative', () => {
  assert.equal(metresPerSecondToMph(26.8224), 60);
  assert.equal(metresPerSecondToMph(0), 0);
  assert.equal(metresPerSecondToMph(-1), 0);
});
