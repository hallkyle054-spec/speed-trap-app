import React from 'react';
import { Appearance } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { VergeWidget } from './VergeWidget';
import { COMPACT_UNDER_DP } from './names';
import { readSummary } from './summary';

/**
 * Runs headless whenever Android asks the widget to redraw. It has no access to
 * the app's providers, so it reads the summary the app last wrote and the
 * system's own light/dark setting.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const summary = await readSummary();
  const isDark = Appearance.getColorScheme() === 'dark';
  // Android reports the size it actually gave the widget, so the layout comes
  // from that rather than from the size the manifest asked for.
  const variant = props.widgetInfo.height < COMPACT_UNDER_DP ? 'compact' : 'tile';
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
