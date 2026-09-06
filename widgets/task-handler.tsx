import React from 'react';
import { Appearance } from 'react-native';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { VergeWidget } from './VergeWidget';
import { variantForHeight } from './names';
import { readSummary } from './summary';
import { widgetIsDark } from './theme';

/**
 * Runs headless whenever Android asks the widget to redraw. It has no access to
 * the app's providers, so it reads the summary the app last wrote and the
 * system's own light/dark setting.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const summary = await readSummary();
  // The palette the driver chose in the app, not whatever the system is doing —
  // except for `system`, which is resolved here so the widget follows a change
  // made hours after the app was last open.
  const isDark = widgetIsDark(summary?.theme, Appearance.getColorScheme() === 'dark');
  const variant = variantForHeight(props.widgetInfo.height);
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
