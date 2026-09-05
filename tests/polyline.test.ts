import assert from 'node:assert/strict';
import { test } from 'node:test';

import { decodePolyline, simplifyPath } from '../data/polyline';

const close = (a: number, b: number, tolerance = 1e-5) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} !== ${b}`);

test("decodes Google's own documented example", () => {
  // From the Encoded Polyline Algorithm Format reference.
  const points = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  assert.equal(points.length, 3);
  const expected = [
    [38.5, -120.2],
    [40.7, -120.95],
    [43.252, -126.453],
  ];
  points.forEach((p, i) => {
    close(p.latitude, expected[i][0]);
    close(p.longitude, expected[i][1]);
  });
});

test('handles an empty string without throwing', () => {
  assert.deepEqual(decodePolyline(''), []);
});

test('a truncated payload returns what it could read rather than garbage', () => {
  const full = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  const cut = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq');
  assert.ok(cut.length < full.length);
  close(cut[0].latitude, 38.5);
});

test('decodes deltas relative to the previous point, not the origin', () => {
  const points = decodePolyline('_p~iF~ps|U_ulLnnqC');
  close(points[0].latitude, 38.5);
  close(points[1].latitude, 40.7);
  assert.notEqual(points[1].latitude, points[0].latitude);
});

test('simplify keeps the endpoints and caps the length', () => {
  const path = Array.from({ length: 5000 }, (_, i) => ({
    latitude: 51.8 + i / 100000,
    longitude: -4.3,
  }));
  const thinned = simplifyPath(path, 400);
  assert.equal(thinned.length, 400);
  assert.deepEqual(thinned[0], path[0]);
  assert.deepEqual(thinned[thinned.length - 1], path[path.length - 1]);
});

test('a short path is returned untouched', () => {
  const path = [
    { latitude: 51.8, longitude: -4.3 },
    { latitude: 51.9, longitude: -4.2 },
  ];
  assert.deepEqual(simplifyPath(path, 400), path);
});
