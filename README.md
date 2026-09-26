# mobile

Read-only React Native (Expo) phone app for the renewvan hub's renewvan bus —
the same live tank/relay/battery view as `renewvan/dashboard`, checkable
from outside the van without a browser. Per
`hub/.scratch/renewvan-hub-v0-build/issues/07-dashboard-phone-app.md`.

Separate codebase from `renewvan/dashboard` — no shared frontend code,
only the same visual/interaction language (domain tabs, radial gauges,
read-only relay list), independently reimplemented with React Native
primitives (`react-native-svg` instead of CSS, etc.).

Connects **directly** to the renewvan bus broker over MQTT-over-WebSocket
(Mosquitto's WS listener) from the phone — no polling backend, not
offline-first. A dropped connection renders a clear "disconnected"
banner, distinguishable from legitimate last-known-state values (every
renewvan-bus topic is retained, so a fresh connection shows real state
immediately, not a blank screen).

## Layout

Three domain tabs, one screen, same tabbed interaction as the web
dashboard:

| Tab | Content |
|---|---|
| Tanks | Radial gauge per tank (`level_pct`), liters-remaining readout, sensor-fault status in place of the readout when `status != ok` |
| Power | Radial gauge per battery (`soc_pct`), voltage/current/power/temperature readout, `charge_state` badge |
| Switches | One row per relay: app-side `id → label` mapping + on/off indicator — **read-only**, no tap-to-toggle (`relay` has no command topic in v0) |

## Architecture

- `src/hooks/useRenewvanBus.ts` — the adapter: owns the MQTT client, subscribes
  `renewvan/#`, accumulates retained messages into a `RenewvanBusState`, exposes
  connection status. Not unit-tested (thin wrapper around `mqtt.js`), per
  the v0 spec's Testing Decisions.
- `src/components/*` — presentational components (`RadialGauge`,
  `RelayRow`, `Tabs`, `ConnectionBanner`), each unit-tested against fixed
  props matching the v0.1 schema shapes (`hub/schema/*.schema.json`).
- `src/tabs/*` — per-domain composition of the presentational components
  over `RenewvanBusState`, also unit-tested against fixture entity maps.
- `src/config/relayLabels.ts` — app-side `id → label` map for the
  Switches tab (label is presentation-only, not a wire field).
- A custom in-screen `Tabs` component switches panels — not Expo Router:
  this is one read-only screen with three panels, not multi-screen
  navigation, so no routes/deep-linking are needed for v0.

## mqtt.js on React Native

`mqtt` (the same client dashboard uses) expects Node-ish `Buffer`/`URL`
globals not present in the Hermes runtime. `index.ts` polyfills both
(`buffer`, `react-native-url-polyfill/auto`) before anything else loads
`mqtt` — required for the MQTT-over-WebSocket connection to work on a
real device/simulator.

## Configuration

All config is Expo build-time-inlined `EXPO_PUBLIC_*` env vars (see
`.env.example` and
[docs.expo.dev/guides/environment-variables](https://docs.expo.dev/guides/environment-variables/)):

| Variable | Default | Notes |
|---|---|---|
| `EXPO_PUBLIC_MQTT_WS_URL` | _(required)_ | Mosquitto's WS listener, phone-reachable, e.g. `ws://<host>:9001` |
| `EXPO_PUBLIC_MQTT_USERNAME` / `EXPO_PUBLIC_MQTT_PASSWORD` | _(none)_ | Read-scoped credentials; blank while the broker allows anonymous access |
| `EXPO_PUBLIC_RELAY_LABELS` | _(built-in defaults)_ | JSON `id -> label` override for the Switches tab |

## Running

```bash
npm install
cp .env.example .env   # set EXPO_PUBLIC_MQTT_WS_URL at minimum
npx expo start          # scan the QR code with Expo Go, or press i/a for a simulator
```

## Testing

```bash
npm install
npm run typecheck
npm run lint
npm test
```

Presentational-component and tab tests run against fixed props/fixture
entity maps only — no live MQTT connection, simulator, or physical
device required. `npx expo lint` and `npx tsc --noEmit` also run clean.

## Building for a physical phone (sideloading)

No Dockerfile/compose service for this repo — it's installed once per
phone, not part of `hub`'s compose flow (see `hub`'s README Install
step 4). Build a standalone binary via
[EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli@latest build --platform android --profile preview
# or --platform ios
```

`EXPO_PUBLIC_*` vars must be set (via `.env` or EAS environment
variables) before building — they're inlined into the bundle at build
time, not read at runtime.

## Manual verification

Automated tests cover the presentational layer only. Before relying on
this outside the van, verify against real hardware/broker (ticket 07
item 6 — not verifiable from this environment: no physical phone,
simulator, or reachable renewvan-bus broker here):

- Install on a physical phone (or simulator) against the real renewvan bus;
  confirm both wired tanks, the house battery, and all 8 relay channels
  render live data once `tank`/`battery`/`relay` upstream components are
  publishing.
- Walk outside the van's own WiFi range (or otherwise lose the broker
  connection) and confirm the connection-lost banner appears clearly,
  rather than a silent blank/stale screen.
