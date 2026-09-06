import React from 'react';
import { Appearance } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { VergeWidget } from './VergeWidget';
import { WIDGETS } from './names';
import { readSummary } from './summary';

/**
 * Runs headless whenever Android asks the widget to redraw. It has no access to
 * the app's providers, so it reads the summary the app last wrote and the
 * system's own light/dark setting.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const summary = await readSummary();
  const isDark = Appearance.getColorScheme() === 'dark';
  // Two widgets share this handler: the home-screen tile and the one sized for
  // a Flip's Flex Window. Anything unrecognised reads as the tile.
  const variant = props.widgetInfo.widgetName === WIDGETS.cover ? 'cover' : 'tile';
  const view = <VergeWidget summary={summary} isDark={isDark} variant={variant} />;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
    case 'WIDGET_CLICK':
      props.renderWidget(view);
      break;
    case 'WIDGET_DELETED':
      break;
    default:
      break;
  }
}
