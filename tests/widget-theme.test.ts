import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  HOST_OVERHANG,
  PANEL_GAP,
  drawable,
  panelBand,
  panelHeadlineSize,
  panelPadding,
} from '../widgets/names';
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

test('the band and the gap in it fit the width available', () => {
  // The bug this guards: an unconstrained sibling set a long road name on one
  // line and pushed the diagram off the right edge of the widget.
  for (const width of [200, 320, 361, 420, 900]) {
    const pad = 22;
    const { inner, caption, diagram } = panelBand(width, pad);
    assert.equal(inner, drawable(width) - pad * 2);
    assert.equal(
      caption + PANEL_GAP + diagram,
      inner,
      `the band must exactly fill the padded width at ${width}dp`,
    );
    assert.ok(caption > 0 && diagram > 0, `both need room at ${width}dp`);
  }
});

test('the diagram stays legible without crowding out its caption', () => {
  assert.equal(panelBand(120, 22).diagram, 72);
  assert.equal(panelBand(2000, 22).diagram, 120);
});

test('the distance fits across the panel and still leaves room beneath it', () => {
  // A real cover screen: about 305 x 297dp.
  const { inner } = panelBand(305, 22);
  const size = panelHeadlineSize(inner, 297);
  // Cormorant needs roughly 3.4dp per point for a string like "12.4 km".
  assert.ok(size * 3.4 <= inner, `"12.4 km" at ${size}pt must fit ${inner}dp across`);
  // And the line it sets must not eat the panel the rest of the reading needs.
  assert.ok(size * 1.2 < 297 * 0.3, `${size}pt leaves too little height beneath it`);
  // Neither dimension alone decides it.
  assert.ok(panelHeadlineSize(1000, 200) < panelHeadlineSize(1000, 1000), 'height must bind');
  assert.ok(panelHeadlineSize(120, 1000) < panelHeadlineSize(1000, 1000), 'width must bind');
  assert.equal(panelHeadlineSize(10, 10), 28);
  assert.equal(panelHeadlineSize(2000, 2000), 76);
});

test('the layout is built from what is drawn, not from what was reported', () => {
  // A Flip's cover screen reports about 326dp for a card that is really 305dp
  // across. Anything sized to the reported number overhangs, and a widget's
  // overhang is not drawn at all — that is how the hairline ran past the card's
  // own edge and took the OPEN button with it.
  const REPORTED = 326;
  const REAL = 306;
  const pad = 22;
  const { inner } = panelBand(REPORTED, pad);
  // The content starts one ordinary pad in and must end inside the card.
  assert.ok(
    pad + inner <= REAL,
    `content ending at ${pad + inner}dp must fit the ${REAL}dp the card really is`,
  );
  assert.equal(drawable(REPORTED), REPORTED - HOST_OVERHANG);
  assert.equal(drawable(10), 0, 'a tiny widget must not report negative room');
});

test('the padding carries the overhang, so match_parent children stop in time', () => {
  // The bug this guards: the hairline is a childless view whose explicit width
  // the toolkit ignores, so it fills the padded bitmap. Two builds shrank every
  // computed width and it still ran off the card, because only the padding
  // decides where a full-width child ends.
  const pad = 22;
  const p = panelPadding(pad, 18);
  assert.equal(p.paddingLeft, pad);
  assert.equal(p.paddingRight, pad + HOST_OVERHANG);
  assert.equal(p.paddingBottom, 18 + HOST_OVERHANG);

  // A full-width child spans the reported width less both paddings, and that
  // has to land inside the card the host really shows.
  const REPORTED = 326;
  const REAL = 306;
  const fullWidth = REPORTED - p.paddingLeft - p.paddingRight;
  assert.ok(
    p.paddingLeft + fullWidth <= REAL - 4,
    `a full-width child ending at ${p.paddingLeft + fullWidth}dp must fit ${REAL}dp`,
  );
  // And it agrees with what the band works out independently.
  assert.equal(panelBand(REPORTED, pad).inner, fullWidth);
});
