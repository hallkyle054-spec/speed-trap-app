import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

import App from './App';

registerRootComponent(App);

// The widget is Android-only, and the module has no web implementation.
if (Platform.OS === 'android') {
  const { registerWidgetTaskHandler } = require('react-native-android-widget');
  const { widgetTaskHandler } = require('./widgets/task-handler');
  registerWidgetTaskHandler(widgetTaskHandler);
}
