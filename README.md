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

Five tabs in one flat bar drawn by the app (`src/components/TabBar.tsx`, ADR 0004), with a raised
Home button in the centre. The renewvan logo is on the left of each tab's header, the Alerts bell
(red dot while an alert is open) on the right:

| Tab      | Content                                                                                                                                                                                      |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Energy   | Solar, alternator and shore charger into the battery and out to the loads, the battery's charge, state and time to go, then the solar controller's daily harvest                             |
| Controls | The heater (dial, operating modes, Start/Stop, readings), then titled panels of Off \| On relay controls, grouped and ordered as set in the dashboard's Settings. A critical load asks first |
| Home     | The van at a glance: temperatures, the map, the power-flow diagram, the heater dial, solar production, tilt, fresh and grey water                                                            |
| Levels   | Sub-tabs: Tanks (level, litres, severity, drain or fill pace), Temperature (every sensor on a -20° to 50° scale) and Tilt                                                                    |
| Settings | The Settings tree, pushed inside the tab                                                                                                                                                     |

Each tab keeps its own stack, so its state, scroll and pushed pages survive a tab switch; tapping the
active tab returns to its first page.
Not in this version: the weather forecast widget on Start, the heater timer, the solar
history charts that read InfluxDB, and the map's place name (the dashboard looks it up online;
the app shows the coordinates).

### Map

Where the van is, from its GPS receiver on the bus, drawn as the dashboard draws it: the
hub's offline Protomaps basemap (`/maps/basemap.pmtiles`, built by the dashboard's
`renewvan-build-basemap` skill) in the app's theme, the van marker facing its heading and leaning
with its pitch, and a readout of the coordinates, the fix, satellites in use, speed and heading.
It is a widget on Start (a still card with a button to the full map) and a full page under
Settings › This phone › Map. With no usable van GPS, a tap can use this phone's foreground
location instead, drawn separately as "Your phone" and never published. The map opens on the
current position, else on Freiburg; it never follows the position on its own, the locate button
brings it back.

The basemap is behind the hub's login. MapLibre fetches with its own HTTP client, which does
not share the app's cookie store, so the session cookie captured at sign-in is added as a
header to MapLibre's requests to the hub and to no other host (`src/components/map/mapSession.ts`).
A phone signed in before this version has no captured cookie and shows "Offline map
unavailable" until it signs out and in again. A broker connection has no hub to serve the map.

### Alerts

The dashboard's alert log: Settings › Alerts › Alert log (the header's Settings button and the Alerts row carry a red dot while any
alert is open) is the list, newest first. Alerts come from the bus, never from a threshold of the app's own:
a tank whose `alarm_state` is `alarm`, a low starter battery, a lost hub connection and a
Tailscale that is down. One opens when its condition starts and resolves when it ends; the row
stays, marked Resolved. Any alert can be deleted, by sliding it left or by its ✕; Clear resolved
deletes every resolved one at once. Deleting an open alert only hides it: it stays quiet until its
condition clears, so it is not raised again at once. The log is kept on the phone, apart from the
dashboard's, and is forgotten on sign-out (another van's alerts are not this one's). Demo mode
raises none of its own and leaves the real van's alerts as they were.

Each new alert is also a system notification (channel "Alerts"; tapping it opens the list), and
Settings › Alerts switches that off. Muting only stops the notifications: the log still
records. The first alert asks the phone for permission, as does switching the setting back on.

These are **local** notifications: the app posts them while its process is alive and connected to
the van (in front, or recently backgrounded). Android suspends a backgrounded app's socket, so a
phone in a pocket for hours, or an app that was swiped away, hears nothing. Remote push (FCM) needs
a sender on the hub watching the same topics and a registered token per phone; that does not exist
yet.

### Settings

The dashboard's Settings tree, for a phone:

| Screen                         | What it does                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Devices                        | Every Driver and what it publishes, by driver or by entity. Tanks (readings, icon), temperature sensors (name, unit, icon), relays (name, icon, group), the heater (controls switch, sensor), batteries with BMS details and the Primary battery, solar chargers, chargers, GPS with satellite signal, tilt (set level, reset) |
| General                        | Firmware versions, About, the shared Demo mode switch                                                                                                                                                                                                                                                                          |
| General › Display & Appearance | The app's theme                                                                                                                                                                                                                                                                                                                |
| Sections                       | Home's available widgets (which, and in what order) and status circles, Energy's power diagram layout (Van tiles or Van orbs), which sensors Levels › Temperature shows, and Controls' relay groups (add, rename, reorder, remove, order the relays inside one)                                                                |
| Alerts                         | Whether a new alert is posted as a notification on this phone, and the way to the alert list                                                                                                                                                                                                                                   |
| Dashboard                      | The van's touchscreen from anywhere: sleep or wake it, brightness, auto-sleep and its timeout                                                                                                                                                                                                                                  |
| Connectivity                   | The cellular router's signal and data use, the bus link and hub, Tailscale                                                                                                                                                                                                                                                     |
| Van                            | The vehicle's details                                                                                                                                                                                                                                                                                                          |
| Map                            | The full map: the van's position on the hub's offline basemap, with fix, satellites, speed and heading                                                                                                                                                                                                                         |
| Automation                     | A placeholder; automation is not available yet                                                                                                                                                                                                                                                                                 |
| Connection                     | Which van this phone is signed in to, and signing out (a red dot on the row while the van is out of reach)                                                                                                                                                                                                                     |

Two kinds of setting live there, and the screens say which is which:

- **Shared, on the bus.** Names, units, icons, relay groups and order, the Primary battery, Demo
  mode, the heater's switches, the tilt level and the kiosk's display. Changing one here changes it
  for the dashboard and every other phone, with the same command the dashboard sends.
- **This phone's own.** Alert notifications, theme, Start widgets, the power layout, hidden sensors, how Devices is sorted and the van's
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

- `src/app/` — Expo Router routes: `sign-in`, and the `(tabs)` group (headless tabs
  with the custom `TabBar`, one stack per tab). Protected routes switch between the two on the session.
- `src/session/` — which van this phone is signed in to: address parsing (`hubAddress.ts`), the
  hub's login service (`hubClient.ts`) and the stored session (`SessionProvider.tsx`).
- `src/bus/` — the bus adapter: one MQTT-over-WebSocket client subscribed to `renewvan/#`
  (`RenewvanBusProvider.tsx`), what each topic does to the state (`reducer.ts`, pure and tested),
  and every command the app sends (`commands.ts`).
- `src/components/native/` — the form controls: buttons, text fields, the switch, the segmented
  choice and the slider, all HeroUI Native (`heroui-native`, the native sibling of the dashboard's
  HeroUI). Uniwind compiles `src/global.css`, which carries the dashboard's theme tokens and its
  4px `--radius`, so both apps draw the same colours and corners (HeroUI's scale, as in the
  dashboard's `docs/design-principles.md`).
  Confirmations are HeroUI dialogs (`confirm`, mounted once by `ConfirmHost`), a heater command the
  heater never confirms is a HeroUI toast, and the dial ticks the phone's haptics.
- `src/components/<domain>/` — the cards each tab stacks. Gauges, the dial, the van diagram and
  the charts are drawn with `react-native-svg`.
- `src/lib/`, `src/types.ts`, `flowModel.ts`, `tankView.ts`, `solarView.ts` — copied from the
  dashboard with their tests. Change them there first, then copy.
- `src/components/settings/` — the Settings screens: one route (`/settings/[view]`) draws every
  view (`SettingsViewScreen.tsx`), built from the rows in `kit.tsx` under the platform's own app
  bar. `routes.ts` names the views.
- `src/alerts/` — the alert log: what opens and resolves an alert (`alertLog.ts`, pure and
  tested), its storage and the diff against the bus (`AlertsProvider.tsx`), and the notifications
  (`notifications.ts`). The list is `components/alerts/AlertsScreen.tsx`, route `/alerts`.
- `src/preferences/` — the phone's own settings: what they are and how they are read back
  (`preferences.ts`, pure and tested) and where they are kept (`PreferencesProvider.tsx`).
- `src/theme/` — the dashboard's light and dark palette as hex; the app follows the phone's
  setting unless Settings says Light or Dark.

## App icon and colors

Both come from the dashboard (its README, "Brand colors and assets"). Do not tune them here.

- Colors: `src/global.css` is the dashboard's theme tokens and `src/theme/index.ts` the same palette as hex (UI accent `#0485f7`, from `oklch(62.04% 0.195 253.83)`). The brand blue of the artwork is `#0385f7`, a hair apart from the accent.
- `assets/icon.png` (1024, iOS and legacy Android): `symbol-white.svg` on `#0385f7`, the van 72% of the width, the same layout as the dashboard's `icon-512.png`.
- `assets/android-icon-foreground.png` (1024, transparent): the dashboard's maskable layout scaled into Android's adaptive-icon safe area. Android shows the middle 72/108 of the canvas, so the van is 41% of the width, 72% of the launcher circle's radius. At 55% it reached 97% and nearly touched the circle.
- `assets/android-icon-monochrome.png` (432): same layout, used for themed icons and as the notification icon (`app.json`).
- The adaptive icon's `backgroundColor` in `app.json` is `#0385f7`.
- Re-render these from the dashboard SVGs rather than editing them. `android/` is generated, so run `npx expo prebuild --clean` after changing an icon or its color.

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

## Over-the-air updates

The store build carries `expo-updates` with the `fingerprint` runtime version, so an update only
reaches builds whose native code matches. Builds on the `preview` and `production` profiles read the
channel of the same name; `development` has none. Settings › About shows the running update id and
a Check for updates button (then Restart to apply); an update is otherwise applied on the next cold
start, with no banner.

- Merging to `main` publishes to `preview` once the Tests workflow passes (`.github/workflows/update.yml`,
  needs the `EXPO_TOKEN` secret).
- Production is a manual promotion: run the "Publish update" workflow with `promote_to_production`.
- **Rolling back**: republish the previous good update to the channel's branch, e.g.
  `npx eas-cli@latest update:republish --group <previous-group-id> --branch production`
  (`npx eas-cli@latest update:list --branch production` lists the groups), or
  `update:rollback-to-embedded` to return to the update built into the store binary.
- A change to native code (a new native module, a config plugin) changes the fingerprint and needs a
  new store build; JS and asset changes do not.

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
- Alerts on a real van, and the notifications on a physical phone (Android 13+ permission prompt,
  channel, tap-through). The log logic is covered by tests; the screens and notifications are not.
- A real relay board and a real heater. Command topics and payloads are the dashboard's.
- The Settings commands against the real hub plugins and Drivers (relay groups and names, icons,
  temperature names and units, tilt level, Primary battery, the kiosk display). On the emulator
  they were checked as messages on the broker, not for their effect.
