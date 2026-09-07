import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diagramColumnWidth } from '../widgets/names';
import { widgetIsDark } from '../widgets/theme';

test('the widget draws in the palette the app was set to', () => {
  // An explicit choice wins over whatever the phone is doing.
  assert.equal(widgetIsDark('dark', false), true);
  assert.equal(widgetIsDark('light', true), false);
});

test('`system` is resolved at render time, so a later switch is followed', () => {
  assert.equal(widgetIsDark('system', true), true);
  assert.equal(widgetIsDark('system', false), false);
});

test('a summary written before the setting existed still renders', () => {
  assert.equal(widgetIsDark(null, true), true);
  assert.equal(widgetIsDark(undefined, false), false);
});

test('the layout keeps clear of edges the host may crop', () => {
  // Both edges have been seen to eat content on a Flip's cover screen, so the
  // diagram column is sized from less than the width that was reported.
  assert.ok(diagramColumnWidth(400) < 400 * 0.34, 'the split must allow for a cropped edge');
  // And it stays sane at both extremes rather than collapsing or running away.
  assert.equal(diagramColumnWidth(120), 84);
  assert.equal(diagramColumnWidth(2000), 140);
});
