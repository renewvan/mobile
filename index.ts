// mqtt.js (via src/hooks/useRenewvanBus.ts) expects Node-ish Buffer/URL globals
// that aren't present in the Hermes/React Native runtime — polyfill first,
// before anything else imports 'mqtt'.
import { Buffer } from 'buffer'
import 'react-native-url-polyfill/auto'
global.Buffer = global.Buffer ?? Buffer
import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
