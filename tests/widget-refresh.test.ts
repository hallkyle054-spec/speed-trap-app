import assert from 'node:assert/strict';
import { test } from 'node:test';

import { RefreshState, shouldRefresh } from '../widgets/refresh';

const LAST: RefreshState = { at: 1_000_000, metres: 500, signature: '6|2026-09-06|system' };
const ask = (over: Partial<Parameters<typeof shouldRefresh>[0]>) =>
  shouldRefresh({
    last: LAST,
    now: LAST.at + 1_000,
    metres: 500,
    signature: LAST.signature,
    minIntervalMs: 60_000,
    minMoveM: 100,
    ...over,
  });

test('a standing still driver does not rewrite the summary every second', () => {
  assert.equal(ask({ metres: 480 }), false);
});

test('a hundred metres of movement rewrites it', () => {
  assert.equal(ask({ metres: 380 }), true);
});

test('the throttle expires', () => {
  assert.equal(ask({ now: LAST.at + 60_000 }), true);
});

test('changing the theme reaches the widget immediately', () => {
  // The bug this guards: the palette is not positional, so a distance
  // threshold must not decide when the driver sees it.
  assert.equal(ask({ signature: '6|2026-09-06|dark' }), true);
});

test('a newly published list reaches the widget immediately', () => {
  assert.equal(ask({ signature: '7|2026-09-07|system' }), true);
});

test('the first write always happens', () => {
  assert.equal(ask({ last: null }), true);
});

test('gaining or losing a fix rewrites rather than comparing against nothing', () => {
  assert.equal(ask({ metres: null }), true);
  assert.equal(ask({ last: { ...LAST, metres: null } }), true);
});
