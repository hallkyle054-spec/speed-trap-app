import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SavedRoute, fixtureRoutes, parseRoutes, routesToPersist, zonesOnRoute } from '../data/routes';
import { fixtureZones } from '../data/zones';

/** Two points is the minimum `parseRoutes` accepts. */
const PATH = [
  { latitude: 51.8, longitude: -4.3 },
  { latitude: 51.7, longitude: -4.2 },
];

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

test('a temporary route is never written to storage', () => {
  const kept: SavedRoute = { id: 'a', title: 'Home → Llanelli', sub: '', path: PATH };
  const temp: SavedRoute = { ...kept, id: 'b', title: 'My location → Llanelli', temporary: true };

  assert.deepEqual(
    routesToPersist([kept, temp]).map(r => r.id),
    ['a'],
    'the temporary route must not reach storage',
  );
  // And it survives a round trip through the parser it would face on reload.
  assert.equal(parseRoutes(JSON.parse(JSON.stringify(routesToPersist([kept, temp])))).length, 1);
});
