import assert from 'node:assert/strict';
import { test } from 'node:test';

import { countyIsOn, setCounties } from '../data/counties';
import { FORCES, UNGROUPED, forceFor, groupByForce } from '../data/forces';

/**
 * The publisher's own list, as its search box prints it — short forms and all.
 * If these stop landing in a force, the picker has silently grown an
 * "Elsewhere" group and the mapping needs a look.
 */
const WALES = [
  'Anglesey',
  'Blaenau',
  'Bridgend',
  'Caerphilly',
  'Cardiff',
  'Carmarthenshire',
  'Ceredigion',
  'Conwy',
  'Denbighshire',
  'Flintshire',
  'Gwynedd',
  'Merthyr',
  'Monmouthshire',
  'Neath Port Talbot',
  'Newport',
  'Pembrokeshire',
  'Powys',
  'Rhondda Cynon Taf',
  'Swansea',
  'Torfaen',
  'Vale of Glamorgan',
  'Wrexham',
];

test('every Welsh unitary authority lands in a force', () => {
  const homeless = WALES.filter(c => forceFor(c) === null);
  assert.deepEqual(homeless, [], 'these counties have no force');
});

test('the four forces between them account for all twenty-two', () => {
  const groups = groupByForce(WALES);
  assert.deepEqual(
    groups.map(g => g.force),
    [...FORCES],
  );
  assert.equal(
    groups.reduce((n, g) => n + g.counties.length, 0),
    WALES.length,
  );
  // The counts are the statutory police areas, not a guess: 4 / 5 / 6 / 7.
  assert.deepEqual(
    groups.map(g => g.counties.length),
    [4, 5, 6, 7],
  );
});

test('a short form and its full name land in the same force', () => {
  // The publisher trims some of these; a rename upstream must not split a force.
  assert.equal(forceFor('Blaenau'), forceFor('Blaenau Gwent'));
  assert.equal(forceFor('Merthyr'), forceFor('Merthyr Tydfil'));
  assert.equal(forceFor('Anglesey'), forceFor('Isle of Anglesey'));
  assert.equal(forceFor('Rhondda Cynon Taf'), forceFor('Rhondda Cynon Taff'));
  assert.equal(forceFor('Vale of Glamorgan'), forceFor('The Vale of Glamorgan'));
});

test('a county the map has not heard of is listed, not lost', () => {
  const groups = groupByForce(['Powys', 'Atlantis']);
  assert.deepEqual(groups.at(-1), { force: UNGROUPED, counties: ['Atlantis'] });
});

test('a force with nothing in the feed is not offered', () => {
  // An empty row would read as a force with no enforcement rather than as a
  // county the feed happens not to carry today.
  assert.deepEqual(
    groupByForce(['Powys', 'Ceredigion']).map(g => g.force),
    ['Dyfed-Powys'],
  );
});

test('the first tap turns everywhere into a real list', () => {
  // Not [] minus one: unticking one county must not read as unticking all.
  assert.deepEqual(setCounties([], WALES, ['Powys'], false), WALES.filter(c => c !== 'Powys'));
});

test('turning a force off takes all of its counties with it', () => {
  const next = setCounties([], WALES, ['Carmarthenshire', 'Ceredigion', 'Pembrokeshire', 'Powys'], false);
  assert.equal(next.length, WALES.length - 4);
  assert.ok(!next.includes('Powys'));
  assert.ok(next.includes('Gwynedd'));
});

test('back to every county is back to the default', () => {
  // So a county the source starts publishing later still arrives on its own,
  // rather than being excluded by a list written before it existed.
  const one = setCounties([], WALES, ['Powys'], false);
  assert.deepEqual(setCounties(one, WALES, ['Powys'], true), []);
});

test('the last county on cannot be turned off', () => {
  const lonely = ['Powys'];
  assert.deepEqual(setCounties(lonely, WALES, ['Powys'], false), lonely);
  // And the alternative it is being refused in favour of — an empty list
  // silently meaning the whole country — never happens.
  assert.equal(countyIsOn('Gwynedd', setCounties(lonely, WALES, ['Powys'], false)), false);
});

test('a stored county the feed has dropped does not block the way back to all', () => {
  const stale = [...WALES.filter(c => c !== 'Powys'), 'Somewhere That Left'];
  assert.deepEqual(setCounties(stale, WALES, ['Powys'], true), []);
});
