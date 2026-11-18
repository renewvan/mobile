# Graph Report - mobile (2026-11-18)

## Corpus Check

- 131 files · ~73,871 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 7)

## Summary

- 1006 nodes · 2896 edges · 38 communities (36 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness

- Built from commit: `294a4cbf`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)

- useTheme
- devices.tsx
- general.tsx
- HeaterCard.tsx
- SessionProvider.tsx
- connectivity.tsx
- drivers.ts
- reducer.ts
- src/types.ts
- expo
- tankView.ts
- dependencies
- PowerFlow.tsx
- package.json
- flowModel.ts
- SolarCard.tsx
- StartCards.tsx
- gps.ts
- DialSlider.tsx
- mapStyle.ts
- steps
- VanMap
- bmsData.ts
- VanMap.tsx
- mobile
- scripts
- eslint.config.js
- charging.ts
- temperature.ts
- withHubNetworkSecurity.js
- tsconfig.json
- Issue tracker: GitHub
- expo-router
- vanMarker.ts
- influxCsv.ts
- jest
- expo-splash-screen@~57.0.11

## God Nodes (most connected - your core abstractions)

1. `useTheme()` - 94 edges
2. `useSettingsData()` - 40 edges
3. `Group()` - 31 edges
4. `content()` - 30 edges
5. `react` - 27 edges
6. `react-native` - 27 edges
7. `Empty()` - 27 edges
8. `StartTab()` - 26 edges
9. `HeaterCard()` - 25 edges
10. `useRenewvanBus()` - 23 edges

## Surprising Connections (you probably didn't know these)

- `This app` --references--> `setMapSession()` [INFERRED]
  AGENTS.md → src/components/map/mapSession.ts
- `firstSolar()` --indirect_call--> `isCompleteSolar()` [INFERRED]
  src/components/widgets/solar/solarView.ts → src/types.ts
- `ClimateTab()` --calls--> `HeaterCard()` [EXTRACTED]
  src/app/(tabs)/climate.tsx → src/components/heater/HeaterCard.tsx
- `ClimateTab()` --calls--> `sortedSensorIds()` [EXTRACTED]
  src/app/(tabs)/climate.tsx → src/lib/temperature.ts
- `ClimateTab()` --calls--> `usePreferences()` [EXTRACTED]
  src/app/(tabs)/climate.tsx → src/preferences/PreferencesProvider.tsx

## Import Cycles

- None detected.

## Communities (38 total, 2 thin omitted)

### Community 0 - "useTheme"

Cohesion: 0.05
Nodes (101): lucide-react-native, react, react-native, isBroker(), SignIn(), styles, ClimateTab(), styles (+93 more)

### Community 1 - "devices.tsx"

Cohesion: 0.06
Nodes (113): CellularView(), ConnectivityView(), HubView(), BmsDetails(), byName(), byNumericId(), CellBars(), describeDriver() (+105 more)

### Community 2 - "general.tsx"

Cohesion: 0.06
Nodes (60): NativeButton(), NativeTextField(), leaveScreen(), POWER_LAYOUT_OPTIONS, relayCount(), RelayGroupView(), RelaysPageView(), THEME_OPTIONS (+52 more)

### Community 3 - "HeaterCard.tsx"

Cohesion: 0.07
Nodes (57): ADR-0023, buildCommands(), Commands, HeaterField, heaterTopic(), relayTopic(), temperatureTopic(), tiltLevelTopic() (+49 more)

### Community 4 - "SessionProvider.tsx"

Cohesion: 0.07
Nodes (45): Agent skills, Building with EAS, Commands, Domain docs, Expo has changed — do not trust your training data, Issue tracker, Navigation & Routing, Rules (+37 more)

### Community 5 - "connectivity.tsx"

Cohesion: 0.08
Nodes (39): RFC-1918, DisplayPower, HubStatus, TailscaleStatus, ConnectionStatus, DRIVER_TONE, TailscaleView(), RouterHealth (+31 more)

### Community 6 - "drivers.ts"

Cohesion: 0.09
Nodes (29): BusData, RenewvanBus, describeDriver(), driverName(), DriverRow, driverRows(), DriverStatus, DriverTone (+21 more)

### Community 7 - "reducer.ts"

Cohesion: 0.12
Nodes (32): ADR-0008, accumulate(), applyDriverMessage(), applyKioskMessage(), applyMessage(), applyRelayMessage(), AUTO_SLEEP_TIMEOUT_CHOICES, commandAllowed() (+24 more)

### Community 8 - "src/types.ts"

Cohesion: 0.09
Nodes (26): ADR-0017, ADR-0022, ADVISORY_PROTECTIONS, PROTECTION_LABELS, core, BY_ID, completeBatteryIds(), primaryBattery (+18 more)

### Community 9 - "expo"

Cohesion: 0.07
Nodes (28): backgroundColor, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, projectId, typedRoutes (+20 more)

### Community 10 - "tankView.ts"

Cohesion: 0.13
Nodes (18): TankLabel, tankView, LOW_ALARM, NOW, tankAlarmConfig, tankAlarmZone, tankLevelStatus, tankSeverity (+10 more)

### Community 11 - "dependencies"

Cohesion: 0.07
Nodes (27): dependencies, expo-constants@~57.0.24, expo-linking@~57.0.14, @expo/material-symbols@^0.1.1, expo-secure-store@~57.0.4, expo-status-bar@~57.0.1, expo-system-ui@~57.0.4, @expo/ui@~57.0.26 (+19 more)

### Community 12 - "PowerFlow.tsx"

Cohesion: 0.11
Nodes (24): VAN_SILHOUETTE_PATH, BATTERY_STATE_LABEL, flowSeconds(), formatPower(), inputWatts(), Anchor, ANCHORS, AnimatedPath (+16 more)

### Community 13 - "package.json"

Cohesion: 0.11
Nodes (25): devDependencies, husky@^9.1.7, jest@^29.7.0, jest-expo@^57.0.5, lint-staged@^15.2.10, prettier@^3.3.3, @react-native/jest-preset@^0.86.3, @testing-library/react-native@^14.0.1 (+17 more)

### Community 14 - "flowModel.ts"

Cohesion: 0.13
Nodes (16): buildFlow(), FlowEdge, FlowInput, FlowNode, IDLE_W, InverterInput, NodeId, PowerSnapshot (+8 more)

### Community 15 - "SolarCard.tsx"

Cohesion: 0.17
Nodes (18): dayLabel(), describe(), SolarHistory(), styles, firstSolarId(), formatYield(), formatYieldAmount(), HISTORY_DAYS (+10 more)

### Community 16 - "StartCards.tsx"

Cohesion: 0.22
Nodes (16): react-native-svg, VAN_REAR_PATH, VAN_REAR_W, styles, TiltCard(), tabular, OUTDOOR_ID, clamp() (+8 more)

### Community 17 - "gps.ts"

Cohesion: 0.17
Nodes (14): SatelliteBar(), CONSTELLATION_LABELS, CONSTELLATION_ORDER, ConstellationGroup, FIX_LABELS, formatSnr(), signalFraction(), signalQuality (+6 more)

### Community 18 - "DialSlider.tsx"

Cohesion: 0.21
Nodes (14): expo-haptics@~57.0.3, expo-haptics, arc(), CENTRE, point(), RADIUS, START_DEG, SWEEP_DEG (+6 more)

### Community 19 - "mapStyle.ts"

Cohesion: 0.14
Nodes (15): @maplibre/maplibre-react-native@^11.5.1, @protomaps/basemaps@^5.7.2, @maplibre/maplibre-react-native, @protomaps/basemaps, BASEMAP_PMTILES_PATH, BASEMAP_SOURCE_ID, basemapStyle(), DARK_LIFTED (+7 more)

### Community 20 - "steps"

Cohesion: 0.12
Nodes (15): jobs, test, name, on, pull_request, push, branches, branches (+7 more)

### Community 21 - "VanMap"

Cohesion: 0.17
Nodes (14): LatLon, parseLastPosition(), readLastPosition(), rememberPosition(), emptyStyle(), formatCoordinates(), Glass(), GpsNotice() (+6 more)

### Community 22 - "bmsData.ts"

Cohesion: 0.21
Nodes (12): allowRow(), BmsBar, BmsCells, bmsGroup, BmsRow, cellsOf(), rows(), core (+4 more)

### Community 23 - "VanMap.tsx"

Cohesion: 0.23
Nodes (13): VAN_BODY_PATH, VAN_BUMPER_PATH, VAN_GLASS_PATHS, VAN_HEADLIGHT_PATH, VAN_HUBS, VAN_SIDE_H, VAN_SIDE_PATH, VAN_SIDE_W (+5 more)

### Community 24 - "mobile"

Cohesion: 0.17
Nodes (11): Architecture, Building for a physical phone, Connecting, Manual verification, Map, mobile, mqtt.js on React Native, Running (+3 more)

### Community 25 - "scripts"

Cohesion: 0.18
Nodes (11): scripts, android, format, format:check, ios, lint, prepare, start (+3 more)

### Community 26 - "eslint.config.js"

Cohesion: 0.20
Nodes (9): { defineConfig }, expoConfig, prettierConfig, eslint@^9.0.0, eslint-config-expo@~57.0.2, eslint-config-prettier@^9.1.0, eslint, eslint-config-expo (+1 more)

### Community 27 - "charging.ts"

Cohesion: 0.31
Nodes (8): chargerIdOf(), chargerWatts(), charging, CHARGING_LABELS, ChargingKind, kindOf(), SingleKind, isCompleteCharger()

### Community 28 - "temperature.ts"

Cohesion: 0.42
Nodes (6): convertTemperature(), formatTemperature(), INDOOR_ID, sortedSensorIds(), temperatureReading(), TemperatureSensor

### Community 29 - "withHubNetworkSecurity.js"

Cohesion: 0.25
Nodes (5): expo@~57.0.25, fs, path, { withAndroidManifest, withDangerousMod }, expo

### Community 30 - "tsconfig.json"

Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, types, extends, include

### Community 31 - "Issue tracker: GitHub"

Cohesion: 0.29
Nodes (6): Conventions, Issue tracker: GitHub, Pull requests as a triage surface, Wayfinding operations, When a skill says "fetch the relevant ticket", When a skill says "publish to the issue tracker"

### Community 32 - "expo-router"

Cohesion: 0.29
Nodes (6): buffer@^6.0.3, expo-router@~57.0.31, react-native-url-polyfill@^4.0.0, buffer, expo-router, react-native-url-polyfill

### Community 33 - "vanMarker.ts"

Cohesion: 0.48
Nodes (5): compassPoint(), facesLeft(), headingDeg(), MIN_HEADING_SPEED_KMH, POINTS

### Community 34 - "influxCsv.ts"

Cohesion: 0.47
Nodes (4): FluxPoint, parseFluxCsv(), splitCsvLine(), HEADER

### Community 35 - "jest"

Cohesion: 0.50
Nodes (4): jest, moduleNameMapper, preset, transformIgnorePatterns

## Knowledge Gaps

- **26 isolated node(s):** `ADR-0013`, `ADR-0028`, `ADR-0023`, `ADR-0008`, `ADR-0021` (+21 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 294 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions

_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `useTheme` to `devices.tsx`, `general.tsx`, `HeaterCard.tsx`, `SessionProvider.tsx`, `dependencies`, `PowerFlow.tsx`, `package.json`, `DialSlider.tsx`, `VanMap.tsx`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `ADR-0013`, `ADR-0028`, `ADR-0023` to the rest of the system?**
  _26 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useTheme` be split into smaller, more focused modules?**
  _Cohesion score 0.05496774193548387 - nodes in this community are weakly interconnected._
- **Why does `useTheme()` connect `useTheme` to `devices.tsx`, `general.tsx`, `HeaterCard.tsx`, `SessionProvider.tsx`, `PowerFlow.tsx`, `SolarCard.tsx`, `StartCards.tsx`, `gps.ts`, `DialSlider.tsx`, `VanMap`, `VanMap.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `devices.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06110283159463487 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `useTheme` to `devices.tsx`, `general.tsx`, `HeaterCard.tsx`, `SessionProvider.tsx`, `dependencies`, `PowerFlow.tsx`, `package.json`, `SolarCard.tsx`, `StartCards.tsx`, `DialSlider.tsx`, `VanMap.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Should `general.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06116700201207243 - nodes in this community are weakly interconnected._
