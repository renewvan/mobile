# OTA updates: fingerprint runtime, preview then promote, silent apply

The app ships JS-only fixes over the air with `expo-updates`, starting with the store build that also adds `expo-location`. The runtime version is the **`fingerprint`** policy, so any change to the native layer gets a new runtime automatically and a JS-only change never does. Channels `preview` and `production` match the build profiles (the `development` profile has none); a change is published to `preview`, checked on the internal build, then **promoted** to `production` with `eas update:republish`, so what was tested is what ships. The app checks at launch, downloads in the background and applies on the next cold start: no banner, no forced reload, no check on foreground. Settings › About shows the update id and a "Check for updates" button that offers "Restart to apply".

## Considered options

- **`appVersion` or a manual runtime string.** Rejected: someone must remember to bump it for every native change, and an update on a mismatched native layer crashes on launch. The fingerprint cannot be forgotten.
- **Reloading when an update arrives.** Rejected: the app is a live control panel used mid-task; a silent reload could drop the screen the user is on.
- **A forced-upgrade gate for old binaries.** Rejected for now: the app already ignores unknown entity types and properties, so an old binary against a newer hub degrades and does not break.

## Consequences

- A native change forces a store build, with no warning from the policy itself; CI can print the fingerprint to make that visible.
- A phone on a build older than the first `expo-updates` build receives nothing over the air.
- A bad update is rolled back by republishing the previous one; a crash on launch falls back to the embedded bundle by itself.
- Changing the runtime policy later splits the installed base, so it is a decision of its own.
