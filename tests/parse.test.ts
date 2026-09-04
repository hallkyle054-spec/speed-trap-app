import assert from 'node:assert/strict';
import { test } from 'node:test';

// @ts-expect-error - plain ESM module shared with the ingest job
import { extractArrayLiteral, readRows, splitDescription, toSites } from '../ingest/parse.mjs';

/** Verbatim shape from the publisher's page, captured by the probe. */
const PAGE = `
  var opsnapmap = [];
  var pois = [ ['A5025, Trgele, Cemaes Bay, Anglesey','53.403372','-4.47532','Mobile','/camera-details?id=2520','Mobile','Anglesey','2520','40'],['A4080/Engedi/Anglesey','53.256601','-4.457597','Mobile','/camera-details?id=2536','Mobile','Anglesey','2536','40'],['Llangefni Link Road, Llangefni','53.250806','-4.2955414','Mobile','/camera-details?id=26511','Mobile','Anglesey','26511','30'],['A484, Llangain, Carmarthenshire','51.7817','-4.3486','Mobile','/camera-details?id=3001','Mobile','Carmarthenshire','3001','60'],['A40 St Clear\\'s, Carmarthenshire','51.8250','-4.4900','Mobile','/camera-details?id=3002','Mobile','Carmarthenshire','3002',''],['A48 Cross Hands, Carmarthenshire','999','-4.07','Mobile','/camera-details?id=3003','Mobile','Carmarthenshire','3003','70'] ];
  var oppois = [ ['Somewhere else','52.1','-3.2','OpSnap','/x','OpSnap','Powys','9','30'] ];
`;

const rowsOf = (name: string) => readRows(extractArrayLiteral(PAGE, name));

test('the site array is extracted without touching the neighbouring arrays', () => {
  assert.equal(rowsOf('pois').length, 6);
  assert.equal(rowsOf('oppois').length, 1);
  assert.equal(extractArrayLiteral(PAGE, 'nosucharray'), null);
});

test('an apostrophe in a place name does not shift the columns', () => {
  const row = rowsOf('pois')[4];
  assert.equal(row[0], "A40 St Clear's, Carmarthenshire");
  assert.equal(row.length, 9);
  assert.equal(row[7], '3002');
});

test('the road number is split off the description', () => {
  assert.deepEqual(splitDescription('A484, Llangain, Carmarthenshire', 'Carmarthenshire'), {
    road: 'A484',
    name: 'Llangain',
  });
  assert.deepEqual(splitDescription('A4080/Engedi/Anglesey', 'Anglesey'), {
    road: 'A4080',
    name: 'Engedi',
  });
  assert.deepEqual(splitDescription('A5025, Trgele, Cemaes Bay, Anglesey', 'Anglesey'), {
    road: 'A5025',
    name: 'Trgele, Cemaes Bay',
  });
});

test('a site with no road number is not given an invented one', () => {
  const { road, name } = splitDescription('Llangefni Link Road, Llangefni', 'Anglesey');
  assert.equal(road, 'Llangefni Link Road');
  assert.equal(name, 'Llangefni');
  assert.doesNotMatch(road, /^[AB]\d/);
});

test('only the requested authority is kept', () => {
  const { sites } = toSites(rowsOf('pois'), { authorities: ['Carmarthenshire'] });
  assert.deepEqual(sites.map(s => s.id), ['gosafe-3001', 'gosafe-3002']);
});

test('an out-of-range coordinate is rejected rather than plotted', () => {
  const { sites, rejected } = toSites(rowsOf('pois'), { authorities: ['Carmarthenshire'] });
  assert.ok(!sites.some(s => s.id === 'gosafe-3003'));
  assert.equal(rejected.length, 1);
  assert.match(rejected[0].problems.join(), /lat 999/);
});

test('a blank speed limit becomes null rather than zero', () => {
  const { sites } = toSites(rowsOf('pois'), { authorities: ['Carmarthenshire'] });
  assert.equal(sites.find(s => s.id === 'gosafe-3001')?.limitMph, 60);
  assert.equal(sites.find(s => s.id === 'gosafe-3002')?.limitMph, null);
});

test('each site carries a link back to its own published page', () => {
  const { sites } = toSites(rowsOf('pois'), { authorities: ['Carmarthenshire'] });
  assert.equal(sites[0].sourceUrl, 'https://www.gosafe.org/camera-details?id=3001');
});
