import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PANEL_GAP, panelColumns, panelHeadlineSize } from '../widgets/names';
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

test('the two columns and the gap between them fit the width available', () => {
  // The bug this guards: an unconstrained reading column set a long road name
  // on one line and pushed the diagram off the right edge of the widget.
  for (const width of [200, 320, 361, 420, 900]) {
    const pad = 22;
    const { reading, diagram } = panelColumns(width, pad);
    assert.equal(
      reading + PANEL_GAP + diagram,
      width - pad * 2,
      `columns must exactly fill the padded width at ${width}dp`,
    );
    assert.ok(reading > 0 && diagram > 0, `both columns need room at ${width}dp`);
  }
});

test('the diagram stays legible without crowding out the reading', () => {
  assert.equal(panelColumns(120, 22).diagram, 80);
  assert.equal(panelColumns(2000, 22).diagram, 130);
  // On a real cover screen the reading keeps the larger share.
  const { reading, diagram } = panelColumns(361, 22);
  assert.ok(reading > diagram, 'the distance is the point; the diagram supports it');
});

test('the distance is sized to fit its column rather than wrapping', () => {
  // A real cover screen: ~305dp wide, so a reading column near 167dp.
  const { reading } = panelColumns(305, 22);
  const size = panelHeadlineSize(reading);
  // Cormorant needs roughly 3.4dp per point for a string like "12.4 km".
  assert.ok(size * 3.4 <= reading, `"12.4 km" at ${size}pt must fit ${reading}dp`);
  // And it does not collapse on a tiny widget or run away on a large one.
  assert.equal(panelHeadlineSize(10), 30);
  assert.equal(panelHeadlineSize(1000), 72);
});
