# Can the native tab bar change its tabs at runtime?

Research for [renewvan/mobile#19](https://github.com/renewvan/mobile/issues/19).

## Scope and verdict

The app uses Expo `~57.0.33` and Expo Router `~57.0.31` (`package.json:11,16`); the installed router is exactly `57.0.31` (`node_modules/expo-router/package.json:3`). SDK 57 therefore uses `expo-router/unstable-native-tabs`, as the current [native-tabs guide](https://docs.expo.dev/router/advanced/native-tabs/) and the [SDK 57 API reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/) specify.

**Yes.** On both iOS and Android, a layout can either set `NativeTabs.Trigger.hidden` from runtime state or conditionally add/remove the trigger. The official guide explicitly allows both ([“Hiding a tab conditionally”](https://docs.expo.dev/router/advanced/native-tabs/#hiding-a-tab-conditionally)). This is supported by the installed implementation, not merely inferred from the prop types.

The practical design for this app is:

- Keep the existing **Start** trigger (`name="index"`) unconditional and first.
- Toggle the four data triggers with `hidden={!available}` (conditional rendering is also valid).
- Keep at most **five visible** tabs on Android.
- Expect a visibility change to remount/reset the tabs, and guard links to routes that are currently hidden.

## What the installed source does

### Trigger collection and `hidden`

1. `NativeTabsNavigatorWrapper` collects direct `NativeTabs.Trigger` children and passes only those to the navigator (`node_modules/expo-router/build/native-tabs/NativeBottomTabsNavigator.js:154-157`). The helper uses `React.Children.toArray(...).filter(...)` (`node_modules/expo-router/build/utils/children.js:15-19`), so direct conditional expressions/arrays work; triggers should remain direct children rather than relying on arbitrary wrapper components or fragments being traversed.
2. A layout trigger always gets a boolean `hidden` option (`node_modules/expo-router/build/native-tabs/NativeTabTrigger.js:75,90-92`).
3. Only triggers whose converted option is `hidden === false` become screens. A hidden trigger is put in `protectedScreens` (`node_modules/expo-router/build/layouts/withLayoutContext.js:28-45`), and `useSortedScreens(..., useOnlyUserDefinedScreens = true)` filters it out (`node_modules/expo-router/build/useScreens.js:124-139`). An omitted trigger is likewise absent because native tabs use only user-defined screens.
4. The navigator filters hidden routes from `visibleTabs`, then passes only those screens to the platform view (`node_modules/expo-router/build/native-tabs/NativeBottomTabsNavigator.js:91-100`). Both `NativeTabsView.ios.js:36-47` and `NativeTabsView.android.js:19-26` map that same list to native `Tabs.Screen` children.

Thus `hidden` is not a CSS-like visibility toggle: the hidden route is removed from this navigator's available screen set. Conditional removal has the same routability consequence.

Use the prop on triggers in `(tabs)/_layout.tsx`. The separate screen-level/dynamic trigger-options path (`isDynamic = true`) does not copy `hidden` into the options (`node_modules/expo-router/build/native-tabs/NativeTabTrigger.js:75-91`), so a screen should not try to hide itself through its own trigger.

## Behavior at runtime

### If the selected tab disappears

The route-name change is reconciled by the tab router (`node_modules/expo-router/build/react-navigation/core/useNavigationBuilder.js:387-395`). Its selected index becomes:

```js
Math.max(0, routeNames.indexOf(state.routes[state.index].name))
```

(`node_modules/expo-router/build/react-navigation/routers/TabRouter.js:165-186`). If the old selected name is absent, `indexOf` returns `-1`, so the **first remaining tab** is selected. With Start kept first and visible, that means **Start**.

There is a larger caveat: Expo documents that dynamically hiding tabs **remounts the navigator and resets state**, and advises changing visibility only before mount or while the navigator is not visible ([guide](https://docs.expo.dev/router/advanced/native-tabs/#hiding-a-tab-conditionally); [SDK 57 `hidden` API](https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/#hidden)). The installed view is keyed by the joined visible route keys, so changing that set replaces the native tabs view (`node_modules/expo-router/build/native-tabs/NativeBottomTabsNavigator.js:102,146-150`). Do not promise preservation of scroll position, nested navigation, or other per-tab UI state across a visibility change.

### Deep links and `router.push` to a hidden route

A hidden route is **not still routable as a tab**. Expo's API explicitly says a hidden tab “cannot be navigated to in any way” ([SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/#hidden); also `node_modules/expo-router/build/native-tabs/types.d.ts:470-477`).

The source matches that contract: hidden/omitted routes are absent from the navigator, and `NAVIGATE`/`JUMP_TO` returns `null` when the target name is absent (`node_modules/expo-router/build/react-navigation/routers/TabRouter.js:195-203`). Therefore a deep link, `<Link>`, or `router.push` must not be used as a back door to a hidden tab. Gate or redirect such navigation to Start (or another visible route); the exact global unmatched-link fallback is separate from NativeTabs' contract.

This differs from `disabled`: a disabled tab stays visible and JavaScript navigation can still select it, whereas `hidden` removes it ([SDK 57 `disabled` API](https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs/#disabled)).

### Android's five-tab limit

The limit matters and applies to the **visible/native-mounted screens**, not to route files or hidden triggers. Expo lists a maximum of five Android tabs as a known limitation ([native-tabs guide](https://docs.expo.dev/router/advanced/native-tabs/#known-limitations)); Material's primary documentation says `BottomNavigationView` does not support more than five menu items ([Material Components](https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md#using-bottom-navigation-view)).

This is enforced, not just a design recommendation. On insertion, React Native Screens checks `index < bottomNavigationView.maxItemCount` and throws `BottomNavigationView supports at most ... items` otherwise (`node_modules/react-native-screens/android/src/main/java/com/swmansion/rnscreens/gamma/tabs/host/TabsHost.kt:85-97`). A sixth simultaneously visible tab therefore causes a native exception rather than automatic truncation or an Android “More” item. The app's current five triggers are already at the cap; any additional visible trigger requires hiding another in the same update.

### If every data tab is hidden

There must effectively be at least one visible trigger to render the tabs UI. With no sorted screens, `withLayoutContext` returns `null` (`node_modules/expo-router/build/layouts/withLayoutContext.js:123-128`), so an all-hidden configuration renders no navigator/content rather than providing a useful empty tab bar.

Keep **Start** (`src/app/(tabs)/_layout.tsx:25-28`) always present. It supplies the permanent landing screen, the first-tab fallback when a selected data tab disappears, and prevents the zero-screen case. There is no need to invent an additional placeholder tab.

## Recommended shape

```tsx
<NativeTabs>
  <NativeTabs.Trigger name="index">{/* Start: always visible */}</NativeTabs.Trigger>
  <NativeTabs.Trigger name="power" hidden={!hasPower}>
    {/* existing icon and label */}
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="tanks" hidden={!hasTanks}>
    {/* existing icon and label */}
  </NativeTabs.Trigger>
  {/* climate and relays follow the same pattern */}
</NativeTabs>
```

`{hasPower && <NativeTabs.Trigger name="power">…</NativeTabs.Trigger>}` is also supported, but `hidden` makes the permanent Start invariant and availability policy easier to read. Neither form avoids the documented remount/state reset. Follow Expo's advice to change visibility before mount or off-screen where possible; if live changes are required, test the remount and Start fallback on both platforms and audit all deep links/navigation entry points.

## Limits and risk notes for this version

- **State reset:** dynamic visibility changes remount/reset tabs; this is the main documented drawback.
- **No hidden-route navigation:** hidden is an availability/navigation gate for the tab navigator, not merely a bar-item styling option.
- **Android hard cap:** six visible tabs throw natively; hidden tabs do not consume a slot.
- **Zero visible tabs:** the layout renders `null`; retain Start.
- **SDK 57 API status:** the import is explicitly `unstable-native-tabs`, so this behavior should be rechecked before an SDK upgrade. The current guide moves to `expo-router/native-tabs` only in SDK 58+.

This was a documentation-and-source investigation of the installed packages; no on-device runtime test was performed.
