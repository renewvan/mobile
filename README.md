# mobile

The renewvan phone app: the same live view and controls as `renewvan/dashboard`, as a native
Android app (Expo / React Native). It shows the van's power, tanks, temperatures and tilt, switches
relays and runs the heater, from the van's own network or over Tailscale.

Separate codebase from `renewvan/dashboard`. The visual language is the dashboard's phone layout,
redrawn with React Native and platform components; the logic that decides what a reading means
(tank severity, power flow, heater rules, relay grouping) is the dashboard's own, copied file for
file with its tests, so the two cannot disagree. The wire contract is the hub's
(`hub/schema/*.schema.json`).

**Status: beta, 0.1.** Expect rough edges and changes before 1.0. The version is `version` in
`app.json` (shown in Settings); it stays numeric, `major.minor.patch`, as the stores require.

Android is the platform this version is built and tested on. Nothing in it is Android-only by
design (every control has a plain React Native fallback), but iOS has not been run.

## What it does

Five tabs, in the platform's own tab bar:

| Tab     | Content                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Start   | The van at a glance: outside and inside temperature, the map, the power-flow diagram, the heater dial, solar production, tilt, fresh and grey water                                                     |
| Power   | Solar, alternator and shore charger into the battery and out to the loads, the battery's charge, state and time to go, then the solar controller's daily harvest                                        |
| Tanks   | One card per tank: level, litres, severity badge, status, temperature and drain or fill pace                                                                                                            |
| Climate | The heater (dial for target temperature or power level, operating modes, Start/Stop, readings), then every temperature sensor on a -20° to 50° scale                                                    |
| Relays  | Titled panels of Off \| On controls, grouped and ordered as set in the dashboard's Settings. A critical load asks first; a command that does not take effect in 4 seconds reads "Didn't switch" + Retry |

Android's tab bar holds at most five tabs, so the dashboard's Heater and Temperature pages share
the Climate tab, and Settings opens from the gear in the header as screens stacked over the tabs.
Not in this version: Alerts, the weather forecast widget on Start, the heater timer, the solar
history charts that read InfluxDB, and the map's place name (the dashboard looks it up online;
the app shows the coordinates).

### Map

Where the van is, from its GPS receiver on the bus, drawn as the dashboard draws it: the
hub's offline Protomaps basemap (`/maps/basemap.pmtiles`, built by the dashboard's
`renewvan-build-basemap` skill) in the app's theme, the van marker facing its heading and leaning
with its pitch, and a readout of the coordinates, the fix, satellites in use, speed and heading.
It is a widget on Start (a still card with a button to the full map) and a full page under
Settings › This phone › Map. The map opens on the van, else on where it last was, else on
Freiburg; it never follows the van on its own, the locate button brings it back.

The basemap is behind the hub's login. MapLibre fetches with its own HTTP client, which does
not share the app's cookie store, so the session cookie captured at sign-in is added as a
header to MapLibre's requests to the hub and to no other host (`src/components/map/mapSession.ts`).
A phone signed in before this version has no captured cookie and shows "Offline map
unavailable" until it signs out and in again. A broker connection has no hub to serve the map.

### Settings

The dashboard's Settings tree, for a phone:

| Screen                         | What it does                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Devices                        | Every Driver and what it publishes, by driver or by entity. Tanks (readings, icon), temperature sensors (name, unit, icon), relays (name, icon, group), the heater (controls switch, sensor), batteries with BMS details and the Primary battery, solar chargers, chargers, GPS with satellite signal, tilt (set level, reset) |
| General                        | Firmware versions, About, the shared Demo mode switch                                                                                                                                                                                                                                                                          |
| General › Display & Appearance | The app's theme, the Start tab's widgets (which, and in what order), the power diagram's layout (Van tiles or Van orbs), which sensors the Climate tab shows, and the Relays page's groups (add, rename, reorder, remove, order the relays inside one)                                                                         |
| General › Kiosk display        | The van's touchscreen from anywhere: sleep or wake it, brightness, auto-sleep and its timeout                                                                                                                                                                                                                                  |
| Connectivity                   | The cellular router's signal and data use, the bus link and hub, Tailscale                                                                                                                                                                                                                                                     |
| Van                            | The vehicle's details                                                                                                                                                                                                                                                                                                          |
| Map                            | The full map: the van's position on the hub's offline basemap, with fix, satellites, speed and heading                                                                                                                                                                                                                         |
| Connection                     | Which van this phone is signed in to, and signing out                                                                                                                                                                                                                                                                          |

Two kinds of setting live there, and the screens say which is which:

- **Shared, on the bus.** Names, units, icons, relay groups and order, the Primary battery, Demo
  mode, the heater's switches, the tilt level and the kiosk's display. Changing one here changes it
  for the dashboard and every other phone, with the same command the dashboard sends.
- **This phone's own.** Theme, Start widgets, the power layout, hidden sensors, how Devices is sorted and the van's
  details, kept in the phone's app storage. The dashboard keeps its equivalents in the kiosk
  browser's storage, which nothing remote can reach; there is no bus topic for them yet, so the
  kiosk's own layout choices (its theme, Start view, navigation position) cannot be changed from
  here.

The app never claims more than the bus says. A command shows as pending until the retained state
changes; a relay or heater whose Driver is offline reads Unknown with its controls disabled; Demo
mode shows the simulated van and sends nothing; a dropped connection shows a banner, because every
bus topic is retained and the last values would otherwise look live.

## Connecting

The sign-in screen asks for the van's address, once. It is stored in the phone's secure store.

- **A hub address** (`192.168.1.50`, `https://renewvan.<tailnet>.ts.net`): the address you open
  the dashboard with. The app signs in to the hub's login service like the dashboard's login page
  does (hub ADR 0029), reads the broker account from `/env.js` and connects to the `/mqtt`
  WebSocket on the same address. The session is a cookie that lasts 30 days; the login password
  is never stored. This is the path that also works over Tailscale.
- **A broker address** (`ws://192.168.1.50:9001`): straight to Mosquitto's WebSocket listener,
  with a broker account if the broker asks for one (hub ADR 0026). Van network and development.

The hub serves HTTPS with its own local CA (hub `docs/reference.md`, "Trust the root on each
phone"). Install that root on the phone as usual; the app is built to trust user-installed CAs
(`plugins/withHubNetworkSecurity.js`), which Android apps do not do by default.

## Architecture

- `src/app/` — Expo Router routes: `sign-in`, and the `(tabs)` group in a native tab bar
  (`NativeTabs`). Protected routes switch between the two on the session.
- `src/session/` — which van this phone is signed in to: address parsing (`hubAddress.ts`), the
  hub's login service (`hubClient.ts`) and the stored session (`SessionProvider.tsx`).
- `src/bus/` — the bus adapter: one MQTT-over-WebSocket client subscribed to `renewvan/#`
  (`RenewvanBusProvider.tsx`), what each topic does to the state (`reducer.ts`, pure and tested),
  and every command the app sends (`commands.ts`).
- `src/components/native/` — the form controls: buttons, text fields, the switch, the segmented
  choice and the slider, all HeroUI Native (`heroui-native`, the native sibling of the dashboard's
  HeroUI). Uniwind compiles `src/global.css`, which carries the dashboard's theme tokens and its
  4px `--radius`, so both apps draw the same colours and corners.
  Confirmations are HeroUI dialogs (`confirm`, mounted once by `ConfirmHost`), a heater command the
  heater never confirms is a HeroUI toast, and the dial ticks the phone's haptics.
- `src/components/<domain>/` — the cards each tab stacks. Gauges, the dial, the van diagram and
  the charts are drawn with `react-native-svg`.
- `src/lib/`, `src/types.ts`, `flowModel.ts`, `tankView.ts`, `solarView.ts` — copied from the
  dashboard with their tests. Change them there first, then copy.
- `src/components/settings/` — the Settings screens: one route (`/settings/[view]`) draws every
  view (`SettingsViewScreen.tsx`), built from the rows in `kit.tsx` under the platform's own app
  bar. `routes.ts` names the views.
- `src/preferences/` — the phone's own settings: what they are and how they are read back
  (`preferences.ts`, pure and tested) and where they are kept (`PreferencesProvider.tsx`).
- `src/theme/` — the dashboard's light and dark palette as hex; the app follows the phone's
  setting unless Settings says Light or Dark.

## mqtt.js on React Native

`mqtt` (the same client the dashboard uses) expects Node-ish `Buffer`/`URL` globals not present in
the Hermes runtime. `index.ts` polyfills both before Expo Router's entry loads anything else.

## Running

The app uses native modules (Reanimated and Gesture Handler for HeroUI Native, the native tab bar,
the secure store), so it needs a
development build; Expo Go cannot run it.

```bash
npm install
npx expo run:android     # builds and installs the development build, then starts Metro
```

After the first build, `npx expo start --dev-client` is enough until a native dependency changes.

The local build needs the Android SDK (platform 36, build-tools 36, NDK 27; Gradle installs what is
missing) and a JDK. With JDK 17 or 21 it works as is. With JDK 25 the native (CMake) steps fail on
a JVM warning unless native access is enabled:

```bash
cd android && JAVA_TOOL_OPTIONS="--enable-native-access=ALL-UNNAMED" ./gradlew assembleDebug "-Dorg.gradle.jvmargs=-Xmx4g --enable-native-access=ALL-UNNAMED"
```

To try it without a van, run a local Mosquitto with a WebSocket listener and `renewvan/driver-demo`
against it, switch Demo mode on (`mosquitto_pub -t renewvan/demo/enabled/set -m true`), and enter
`ws://10.0.2.2:<port>` in the emulator (`10.0.2.2` is the host machine).

## Testing

```bash
npm run typecheck
npm run lint
npm test
```

The tests cover the logic: the bus reducer, address parsing, the stored preferences, the dial's
geometry and everything copied from the dashboard. The screens have no automated tests; see Manual verification.

`.npmrc` sets `legacy-peer-deps`: the lockfile is resolved that way (an optional web peer of
`expo-router` asks for a newer React than Expo SDK 57 pins), and `npm ci` needs the same setting.

## Building for a physical phone

Not part of `hub`'s compose flow; installed once per phone. Build a standalone APK with
[EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli@latest build --platform android --profile preview
```

or locally with `cd android && ./gradlew assembleRelease` after `npx expo prebuild`. The `android/`
directory is generated (Continuous Native Generation) and not committed: native settings live in
`app.json` and `plugins/`.

## Manual verification

Verified on an Android 14 emulator against a local broker: the five tabs with `driver-demo`'s
simulated van in light and dark, relay switching including the "Didn't switch" case, the heater's
dial, modes and Start, signing in through a stand-in for the hub's login service (cookie sent on
`/env.js` and on the `/mqtt` WebSocket), signing out, and reconnecting after a restart. In
Settings: the Devices lists and a relay's name, icon and group (commands checked on the broker), the
kiosk display's brightness, timeout and power commands, the theme, and the Start widgets' order and
visibility surviving a reinstall.

Not yet verified, and worth doing before relying on it:

- A real hub over HTTPS: installing Caddy's root on a phone and signing in with the real login.
- A physical phone, on the van's Wi-Fi and over Tailscale, including walking out of range and back.
- A real relay board and a real heater. Command topics and payloads are the dashboard's.
- The Settings commands against the real hub plugins and Drivers (relay groups and names, icons,
  temperature names and units, tilt level, Primary battery, the kiosk display). On the emulator
  they were checked as messages on the broker, not for their effect.
