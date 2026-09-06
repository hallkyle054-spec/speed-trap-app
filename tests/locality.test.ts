import assert from 'node:assert/strict';
import { test } from 'node:test';

import { localityRadius, localityScale, localitySvg } from '../widgets/locality';

const COLOURS = { mark: '#a06f24', ring: '#cccccc', ink: '#201f1d' };

test('the diagram covers the furthest zone rather than clipping it', () => {
  // 3 km east: the radius has to reach past it, or the mark lands off the edge.
  const radius = localityRadius([{ east: 3000, north: 0 }]);
  assert.ok(radius > 3000, `radius ${radius} must clear the furthest mark`);
});

test('an empty locality still has a sane scale rather than collapsing to zero', () => {
  assert.ok(localityRadius([]) >= 800);
  assert.equal(localityScale(2000), '2 km');
  assert.equal(localityScale(800), '800 m');
});

test('north is up and east is right', () => {
  const svg = localitySvg([{ east: 0, north: 1000 }], COLOURS);
  const mark = /<circle cx="([\d.]+)" cy="([\d.]+)" r="3\.1"/.exec(svg);
  assert.ok(mark, 'the zone should be drawn');
  const [, cx, cy] = mark;
  assert.equal(Number(cx), 60, 'due north stays on the centre line');
  assert.ok(Number(cy) < 60, 'due north draws above the centre');

  const east = localitySvg([{ east: 1000, north: 0 }], COLOURS);
  const [, ex, ey] = /<circle cx="([\d.]+)" cy="([\d.]+)" r="3\.1"/.exec(east)!;
  assert.ok(Number(ex) > 60, 'due east draws right of the centre');
  assert.equal(Number(ey), 60, 'due east stays on the centre line');
});

test('a zone with broken geometry is dropped, not drawn at NaN', () => {
  const svg = localitySvg([{ east: Number.NaN, north: 0 }], COLOURS);
  assert.doesNotMatch(svg, /NaN/);
});
