This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Agent skills

### Issue tracker

Issues live in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## This app

- Read `README.md` first: what the app does, how it connects to a van, and where things live.
- Form controls come from `src/components/native`: thin wrappers over HeroUI Native
  (`heroui-native`) with the same props on every platform. Screens import the wrappers, not HeroUI.
- HeroUI Native is styled by Uniwind (Tailwind 4) from `src/global.css`, a copy of the dashboard's
  theme tokens (`dashboard/src/global.css`) and its 4px `--radius`. Change a token in the dashboard
  first, then copy it there and into the hex palette in `src/theme`, which hand-drawn parts read.
- The app icon and brand blue (`#0385f7`) come from the dashboard's logo SVGs; keep the van's proportions in `assets/android-icon-*.png` as described in the README ("App icon and colors").
- Corner radii are HeroUI's scale from the one `--radius` token (4px), as in the dashboard's
  `docs/design-principles.md` ("Corner radii"): `radius` in `src/theme` or Tailwind's `rounded-*`.
  A part we draw takes the radius of the HeroUI component it resembles: `3xl` for buttons, toggles
  and cards, `2xl` for chips, badges (the DEMO badge too) and Settings rows, `xl` for notes, `lg`
  for level bars. A circle only for what is round by nature. Never a number or a pill, and a
  pressable's Android ripple stays inside its corners (`overflow: 'hidden'`, not `borderless`).
- `src/lib/`, `src/types.ts` and the `*Model.ts` / `*View.ts` files are copied from `renewvan/dashboard`
  with their tests. Change them in the dashboard first, then copy; never let the two drift.
- A command is never assumed to have worked: the UI follows the retained state on the bus, shows a
  command as pending until that state changes, and sends nothing in Demo mode.
- Dependencies are installed with `legacy-peer-deps` (`.npmrc`); `npx expo install` picks it up.
- Settings are of two kinds. Shared ones are topics on the bus and go through `src/bus/commands.ts`;
  the phone's own go through `src/preferences`. Never store a shared setting on the phone, and never
  invent a bus topic for a personal one: a new shared setting starts in `hub`.
- The map is `src/components/map/VanMap.tsx` on MapLibre native, a native module: changing it
  needs a development build, not Expo Go. Its basemap is the hub's `/maps/` behind the login;
  the session reaches MapLibre only through `setMapSession` in `mapSession.ts`, scoped to the
  hub's origin. Never send that cookie to another host.
- A new Settings screen is a name in `src/components/settings/routes.ts`, a title and a case in
  `SettingsViewScreen.tsx`, and a view built from `kit.tsx`.

- Write the product name "Renewvan" in prose and UI text, never "renewvan" or "RenewVan"; lowercase `renewvan` stays only in identifiers (topics, URLs, bucket, host, bundle IDs). See "Brand spelling" in `hub/CONTEXT.md`.
