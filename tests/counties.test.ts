import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countiesIn, inSelectedCounties } from '../data/counties';
import { Zone } from '../data/zones';
import { defaultSettings, reconcile } from '../state/settingsSchema';

const zone = (id: string, authority?: string): Zone => ({
  id,
  road: id,
  name: id,
  limitMph: 30,
  note: '',
  authority,
  firstListed: '2026-01-01',
  lastListed: '2026-09-07',
  path: [{ latitude: 51.8, longitude: -4.3 }],
});

const ZONES = [
  zone('a', 'Carmarthenshire'),
  zone('b', 'Gwynedd'),
  zone('c', 'Carmarthenshire'),
  zone('d'),
];

test('the county list is what the feed actually contains, in order', () => {
  assert.deepEqual(countiesIn(ZONES), ['Carmarthenshire', 'Gwynedd']);
});

test('choosing nothing means the whole country, not an empty map', () => {
  // The distinction that matters: a driver who has never opened the list, and
  // one who has unticked every county, must not be given the same silence.
  assert.equal(ZONES.filter(z => inSelectedCounties(z, [])).length, ZONES.length);
});

test('choosing counties keeps those and drops the rest', () => {
  const kept = ZONES.filter(z => inSelectedCounties(z, ['Carmarthenshire']));
  // 'd' has no authority, so no county filter can exclude it — see below.
  assert.deepEqual(kept.map(z => z.id), ['a', 'c', 'd']);
  assert.ok(!kept.some(z => z.authority === 'Gwynedd'), 'an unpicked county is dropped');
});

test('a zone with no authority survives a filter it cannot answer', () => {
  // Feeds built before authorities were carried are still good data; dropping
  // them would silently empty the map for anyone who picked a county.
  assert.equal(inSelectedCounties(zone('x'), ['Gwynedd']), true);
});

test('a stored county list is only trusted if it really is a list of names', () => {
  assert.deepEqual(reconcile({ counties: ['Powys', 'Powys'] }).counties, ['Powys']);
  assert.deepEqual(reconcile({ counties: 'Powys' }).counties, defaultSettings.counties);
  assert.deepEqual(reconcile({ counties: [1, 2] }).counties, defaultSettings.counties);
  assert.deepEqual(reconcile({ counties: {} }).counties, defaultSettings.counties);
});
