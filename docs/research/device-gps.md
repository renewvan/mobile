# Device GPS in Expo: what it costs the app

Research for [renewvan/mobile#18](https://github.com/renewvan/mobile/issues/18). The versioned
source of truth is Expo SDK **57**: `package.json` pins `expo` to `~57.0.33`; `expo-location` is
not installed.[^repo-package] The SDK 57 Location page was checked directly, together with Expo's
SDK 57 source and first-party Apple and Google documentation.[^expo-location]

## Short answer

A foreground-only “my position” feature needs `expo-location`, its config plugin, an iOS
when-in-use purpose string, and Android coarse/fine location permissions. It does **not** need iOS
Always authorization, iOS background mode, Android background location, or an Android foreground
service. The module supports foreground use in Expo Go, but this app already requires a development
build and therefore cannot use that route without removing its other native dependencies.[^expo-location][^repo-readme]

Adding the module is a native-runtime and permission change: regenerate the native projects and
make a new development binary, then make and distribute a new production binary for existing users.
This repository has EAS Build configuration but no `expo-updates`, no `updates` configuration, and
no `runtimeVersion` policy, so it has no OTA path today. Even with Expo Update added later, a
JS-only change could use a compatible runtime OTA, while this native-module/permission change could
not.[^repo-package][^repo-app][^repo-eas][^update-intro][^runtime-versions]

For the store privacy forms, permission use is not itself the test. If phone coordinates are only
read and rendered on the phone, neither Apple nor Google counts that as collection. If coordinates
go to the hub or another server, revisit the declaration: Google treats any off-device transmission
as collection (with a special ephemeral-processing form answer), while Apple's definition also
requires access/retention beyond servicing the real-time request.[^apple-privacy][^play-data-safety]

## 1. Native configuration for foreground-only use

Install the SDK-compatible package with `npx expo install expo-location` and add its built-in plugin
to `expo.plugins` in `app.json`. In this CNG app, prebuild applies the native configuration; do not
hand-edit generated `ios/` or `android/` files. The Location documentation explicitly says its
plugin properties require a new app binary.[^expo-location]

An illustrative foreground-only plugin entry is:

```json
[
  "expo-location",
  {
    "locationWhenInUsePermission": "Allow $(PRODUCT_NAME) to show this phone on the van map."
  }
]
```

The string is an example, not a change made by this research. If the option is omitted, SDK 57
documents the generic default `Allow $(PRODUCT_NAME) to use your location`; a feature-specific
string explains the actual purpose.[^expo-location]

| Platform | Required for this scope                                                                                                                     | Not needed for this scope                                                                                                                                                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS      | `NSLocationWhenInUseUsageDescription`, set by `locationWhenInUsePermission`. `requestForegroundPermissionsAsync()` maps to **When In Use**. | Always authorization, `UIBackgroundModes: ["location"]`, and `requestBackgroundPermissionsAsync()`. `isIosBackgroundLocationEnabled` defaults to `false`.                                                                                             |
| Android  | `ACCESS_COARSE_LOCATION` (approximate) and `ACCESS_FINE_LOCATION` (precise). Installing the module adds both automatically.                 | `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, and `FOREGROUND_SERVICE_LOCATION`. Both background switches default to foreground-only behavior; the foreground-service switch defaults to `false` unless Android background location is enabled. |

The platform rows and defaults come from the SDK 57 Location documentation.[^expo-location] One
purpose-string nuance is visible in the plugin source: it registers all three location usage keys
(`NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, and the
deprecated `NSLocationAlwaysUsageDescription`) with generic defaults. Seeing the Always-related
strings in generated Info.plist therefore does **not** mean the app has Always authorization or a
location background mode; foreground-only behavior still comes from requesting When In Use and not
enabling the background options.[^location-plugin]

Expo also documents that an app which does not need precise fixes can exclude `ACCESS_FINE_LOCATION`;
its example pairs low accuracy with coarse-only permission. Omitting a permission the chosen API or
accuracy needs can break the feature, so this is an accuracy/permission choice, not a harmless
manifest cleanup.[^expo-location]

Foreground-only here means foreground **updates**, not merely avoiding the word “background” in the
manifest. `watchPositionAsync()` only delivers while the application is in the foreground. Android
background/closed access and iOS Always access are separate APIs and permissions. Keeping the
scope foreground-only also avoids the special Play review/access processes Expo links for Android
location foreground services and background location.[^expo-location][^location-api]

### Expo Go

The SDK 57 page marks `expo-location` as included in Expo Go, so its one-shot and foreground watch
APIs are available there. Background location is not supported in Expo Go on iOS, and foreground
and background services are unavailable in Expo Go on Android. Those limitations do not block the
foreground-only scope.[^expo-location]

That answers the library question, not the app question: this repository's README says its existing
native modules already make Expo Go unable to run the app. Device GPS would be developed in a new
development build like the rest of this app.[^repo-readme]

## 2. Build, release, and OTA cost

Repository facts at commit `d21ee0d16b0e9ddb73303af35e196e5bea3bcc20`:

- `expo-location` and `expo-updates` are absent from dependencies and the lockfile.[^repo-package]
- `app.json` has no `updates` or `runtimeVersion` property. Its EAS project ID links the project to
  Expo services but does not configure Update.[^repo-app]
- `eas.json` defines development, preview, and production **build** profiles, not an OTA setup.[^repo-eas]
- `git ls-files ios android` is empty and both directories are ignored as generated native folders.
  The README explicitly describes them as uncommitted CNG output, with native settings in `app.json`
  and `plugins/`. A clean research worktree therefore contains neither directory; locally generated
  copies are not native source to edit or commit.[^repo-native]

Consequences:

1. **Development:** adding a native library or changing app config requires regenerating native
   directories and rebuilding. Expo's development-build guide says to run `npx expo prebuild --clean`
   when native dependencies or app config change; EAS Build/run commands prebuild automatically when
   the directories are absent.[^dev-builds]
2. **Production:** the new native code and manifest/Info.plist permissions must exist in the binary.
   Existing store users therefore need a newly built, submitted, and released app version. An
   internally distributed APK still needs a new binary, just not a store submission.
3. **OTA today:** none is configured, so neither JS nor this feature can currently ship through Expo
   Update. Expo Update requires the `expo-updates` library, and adding that library itself requires
   a new build before updates can be received.[^update-intro]
4. **If Update is added later:** JS, styling, and images can ship to builds with a compatible
   runtime. Expo explicitly lists native dependencies, app permissions such as location, and other
   new-binary changes as unsuitable for Update. Runtime versions prevent a JS bundle from being sent
   to an incompatible native binary; adding `expo-location` requires a new build/runtime before
   publishing dependent JS. A `fingerprint` policy changes the runtime when native-affecting inputs
   change; a manually managed or `appVersion` policy must be bumped appropriately.[^update-intro][^runtime-versions]

Thus OTA would reduce later JS-only release friction, but it does not reduce this feature's initial
native build/release cost.

## 3. Foreground “my position” APIs and power/accuracy choices

### One-shot versus continuous

| API                                                       | Behavior                                                                                                        | Cost/fit documented by Expo                                                                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCurrentPositionAsync(options)`                        | Actively obtains and returns one current `LocationObject`.                                                      | A fresh fix can take several seconds, depending on the requested accuracy and especially indoors. It is the bounded operation for a user-requested current fix rather than an ongoing stream. |
| `watchPositionAsync(options, callback, errorHandler?)`    | Returns a `LocationSubscription`; invokes the callback with successive locations until `subscription.remove()`. | Foreground only. Continuous operation has ongoing cost until removed; `timeInterval` and `distanceInterval` can limit update delivery.                                                        |
| `getLastKnownPositionAsync({ maxAge, requiredAccuracy })` | Returns a cached position or `null` if unavailable/too old/too inaccurate.                                      | Faster because it does not request a fresh fix, but the result can be stale. It is an optional complement, not a guarantee of current position.                                               |

These behaviors and signatures are from SDK 57's Location implementation and generated API
documentation.[^expo-location][^location-api] The returned `LocationObject` contains a millisecond
`timestamp` and `coords` with latitude, longitude, altitude, horizontal accuracy in meters, heading,
and speed; nullable fields can be `null`.[^location-types]

`LocationOptions` defaults to `LocationAccuracy.Balanced`. Android also has
`mayShowUserSettingsDialog` (default `true`), which can ask the user to enable improved accuracy.
`timeInterval` is an Android-only minimum wait in milliseconds; `distanceInterval` requests updates
only after at least the given movement in meters. Defaults for the intervals can depend on the
selected accuracy.[^location-types]

### Accuracy levels

| SDK 57 `LocationAccuracy` | Documented nominal accuracy/behavior                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| `Lowest = 1`              | Nearest three kilometres.                                                  |
| `Low = 2`                 | Nearest kilometre.                                                         |
| `Balanced = 3`            | Within 100 metres; the default.                                            |
| `High = 4`                | Within 10 metres of the desired target.                                    |
| `Highest = 5`             | Best available accuracy.                                                   |
| `BestForNavigation = 6`   | Highest possible accuracy plus additional sensor data for navigation apps. |

The enum descriptions are from SDK 57 source.[^location-types] Expo's only general battery
quantification is qualitative: low accuracies can avoid providers that consume significant power,
such as GPS. A one-shot request ends after its fix; a watch remains active until removed. The docs
provide no defensible mAh, percentage-per-hour, or fixed ranking for every device, so this research
does not invent one. Accuracy/distance/time choices and the lifetime of a subscription are the
available cost controls.[^location-types][^location-api]

## 4. Permission and availability states

Use `getForegroundPermissionsAsync()` to inspect without prompting and
`requestForegroundPermissionsAsync()` to request; `useForegroundPermissions()` wraps both. They
return `LocationPermissionResponse`, which extends Expo's common `PermissionResponse`.[^location-api][^location-types]

| UI concept                    | SDK 57 representation                                                                                                                                                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Undetermined                  | `status: 'undetermined'`: the user has not granted or denied it; `granted` is false.                                                                                       |
| Denied, can ask again         | `status: 'denied'`, `granted: false`, `canAskAgain: true`.                                                                                                                 |
| Blocked / cannot prompt again | There is **no** separate `'blocked'` status in SDK 57. It is represented by `status: 'denied'` with `canAskAgain: false`; Expo says to direct the user to system Settings. |
| Granted                       | `status: 'granted'` and the convenience boolean `granted: true`.                                                                                                           |

The three-value enum and `canAskAgain` semantics come directly from `expo-modules-core` on the
`sdk-57` branch.[^permission-type]

Additional state that should not be collapsed into those four concepts:

- Android's location permission response includes `android.accuracy: 'fine' | 'coarse' | 'none'`;
  iOS includes `ios.accuracy: 'full' | 'reduced'` and `ios.scope`. A grant can therefore be
  approximate rather than precise.[^location-types]
- iOS **Allow Once** grants When In Use only for the current session. iOS does not let Expo
  distinguish it from “Allow While Using the App”; both report When In Use authorization.[^expo-location]
- Device-wide location services being off is separate from app permission;
  `hasServicesEnabledAsync()` checks it.[^location-api]

## 5. App Store privacy nutrition label and Play Data safety

### Local-only display: no new collected-location entry

For a feature that reads the phone fix and draws a marker on the existing map without transmitting
that fix off the phone:

- **Apple:** no Precise Location or Coarse Location nutrition-label entry is added solely because
  the permission/API is used. Apple explicitly says data used only on device and never sent to a
  server is not “collected” and need not be disclosed.[^apple-privacy]
- **Google Play:** on-device access/processing that is not sent off device need not be disclosed as
  collected, so local-only display adds no Approximate/Precise location collection entry.[^play-data-safety]

On-device persistence does not by itself change those off-device tests. Both stores still require
accurate overall forms and coverage of third-party SDK behavior; this conclusion addresses the new
phone-location data flow only.[^apple-privacy][^play-data-safety]

### If the phone position leaves the device

The declaration depends on the implementation, especially whether it is published to the hub or
another service:

- **Apple:** “Collect” means transmitting off device in a way that allows the developer or a partner
  access for longer than necessary to service the request in real time. Data only used to service a
  request and not retained afterward need not be disclosed. If the hub retains the position or keeps
  it accessible beyond that transient request, declare the applicable **Precise Location** or
  **Coarse Location**, its purpose (for this feature, ordinarily **App Functionality**), whether it
  is linked to the user, and whether it is used for tracking. Apple defines precise as resolution at
  least equal to latitude/longitude with three or more decimal places; lower resolution is coarse.[^apple-privacy]
- **Google Play:** any transmission from the app off the device is collection, including transmission
  to the developer's own server or by an SDK. Declare Approximate or Precise Location and answer its
  required/optional, purpose, retention/deletion, and security questions. If it is only stored in
  memory for no longer than necessary to service the real-time request, mark it as ephemerally
  processed: Google still requires it in the form response, but says it will not be disclosed in the
  public Data safety section. Google defines approximate as an area at least 3 square kilometres
  (for example `ACCESS_COARSE_LOCATION`) and precise as less than 3 square kilometres (for example
  `ACCESS_FINE_LOCATION`).[^play-data-safety]
- **Sharing/tracking:** off-device collection and third-party sharing are separate questions. Do not
  infer sharing or advertising tracking merely from a foreground marker; declare them only if the
  actual data flow meets the respective definitions.[^apple-privacy][^play-data-safety]

The manifest permission alone does not decide the form, and “foreground only” does not exempt data
that is transmitted or retained. Conversely, adding the SDK does not automatically create a privacy
label entry when all processing stays on the phone.

## 6. Existing MapLibre seam for a second position source

No design is proposed here; this is the current data path in `src/components/map/VanMap.tsx`:

1. `VanMap` reads `useRenewvanBus().state.gps`, finds the first record for which `isCompleteGps` is
   true, and passes that bus `Gps` record as the memoized `VanMapView`'s `record` prop.[^repo-map]
2. `VanMapView` applies `hasGpsFix(record)`, then derives `latitude`, `longitude`, and heading. Those
   values drive the opening position, one-time recentering on the first fix, last-position storage,
   and the existing **Centre on van** button.[^repo-map][^repo-types]
3. The memoized `MapCanvas` already receives primitive `latitude`, `longitude`, `heading`, `pitch`,
   and `vanColor` props separately from the bus record. It passes `[longitude, latitude]` to the
   native MapLibre `<Marker id="van">`. The original `record` separately feeds the fix/satellite/
   speed/heading readout or the no-fix/no-data notice.[^repo-map]

The seam is therefore the `VanMap` → `VanMapView.record` boundary and, below it, `MapCanvas`'s
primitive coordinate props; MapLibre itself has no dependency on `state.gps`. An Expo
`LocationObject` is not a drop-in bus `Gps`: Expo supplies `coords` and a millisecond timestamp,
while the current marker/readout contract uses bus fix quality, satellite count, `speed_kmh`,
`course_deg`, and ISO `fix_time`.[^location-types][^repo-types] The existing marker ID, center action,
and notices are also explicitly van-specific.[^repo-map]

## Sources

[^repo-package]: renewvan/mobile, [`package.json` at d21ee0d](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/package.json) and [`package-lock.json`](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/package-lock.json).

[^repo-app]: renewvan/mobile, [`app.json` at d21ee0d](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/app.json).

[^repo-eas]: renewvan/mobile, [`eas.json` at d21ee0d](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/eas.json).

[^repo-readme]: renewvan/mobile, [`README.md`, “Running”](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/README.md#running).

[^repo-native]: renewvan/mobile, [`.gitignore`, generated native folders](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/.gitignore#L39-L41) and [`README.md`, “Building for a physical phone”](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/README.md#building-for-a-physical-phone).

[^repo-map]: renewvan/mobile, [`src/components/map/VanMap.tsx`](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/src/components/map/VanMap.tsx).

[^repo-types]: renewvan/mobile, [`src/types.ts`, GPS types and guards](https://github.com/renewvan/mobile/blob/d21ee0d16b0e9ddb73303af35e196e5bea3bcc20/src/types.ts#L266-L328).

[^expo-location]: Expo SDK 57, [Location](https://docs.expo.dev/versions/v57.0.0/sdk/location/) (installation, config plugin, platform permissions, Expo Go support, background behavior, and generated API documentation). The docs index used was [Expo `llms.txt`](https://docs.expo.dev/llms.txt).

[^location-api]: Expo SDK 57 source, [`packages/expo-location/src/Location.ts`](https://github.com/expo/expo/blob/sdk-57/packages/expo-location/src/Location.ts).

[^location-types]: Expo SDK 57 source, [`packages/expo-location/src/Location.types.ts`](https://github.com/expo/expo/blob/sdk-57/packages/expo-location/src/Location.types.ts).

[^location-plugin]: Expo SDK 57 source, [`packages/expo-location/plugin/src/withLocation.ts`](https://github.com/expo/expo/blob/sdk-57/packages/expo-location/plugin/src/withLocation.ts).

[^permission-type]: Expo SDK 57 source, [`packages/expo-modules-core/src/PermissionsInterface.ts`](https://github.com/expo/expo/blob/sdk-57/packages/expo-modules-core/src/PermissionsInterface.ts).

[^dev-builds]: Expo, [Introduction to development builds — rebuild when native code changes](https://docs.expo.dev/develop/development-builds/introduction/#rebuild-when-native-code-changes).

[^update-intro]: Expo, [Expo Update — non-native updates and scenarios requiring a new binary](https://docs.expo.dev/eas-update/introduction/).

[^runtime-versions]: Expo, [Runtime versions and updates](https://docs.expo.dev/eas-update/runtime-versions/).

[^apple-privacy]: Apple Developer, [App privacy details on the App Store](https://developer.apple.com/app-store/app-privacy-details/).

[^play-data-safety]: Google Play Console Help, [Provide information for Google Play's Data safety section](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en).
