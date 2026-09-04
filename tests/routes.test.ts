import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fixtureRoutes, zonesOnRoute } from '../data/routes';
import { fixtureZones } from '../data/zones';

const route = (id: string) => {
  const found = fixtureRoutes.find(r => r.id === id);
  assert.ok(found, `no route ${id}`);
  return found;
};

test('the coast road picks up the A484 zone', () => {
  assert.deepEqual(
    zonesOnRoute(route('r1'), fixtureZones).map(z => z.road),
    ['A484'],
  );
});

test('the school run picks up the A40 zone', () => {
  assert.deepEqual(
    zonesOnRoute(route('r2'), fixtureZones).map(z => z.road),
    ['A40'],
  );
});

test('the Llandovery run has nothing published on it, exercising the empty state', () => {
  assert.deepEqual(zonesOnRoute(route('r3'), fixtureZones), []);
});

test('an empty zone list leaves every route at zero', () => {
  for (const r of fixtureRoutes) assert.deepEqual(zonesOnRoute(r, []), []);
});
