import assert from 'node:assert/strict';
import { test } from 'node:test';

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
