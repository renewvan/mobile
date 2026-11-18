// mqtt.js (via src/bus/RenewvanBusProvider.tsx) expects Node-ish Buffer/URL globals that aren't
// present in the Hermes/React Native runtime: polyfill first, before anything else imports 'mqtt'.
// Expo Router's entry is imported last for that reason; it registers the root component.
import { Buffer } from 'buffer'
import 'react-native-url-polyfill/auto'

global.Buffer = global.Buffer ?? Buffer

// eslint-disable-next-line import/first
import 'expo-router/entry'
