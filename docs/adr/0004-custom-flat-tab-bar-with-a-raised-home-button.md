# A custom, flat tab bar with a raised Home button, not the native bar

The bottom bar is drawn by the app (headless tabs from `expo-router/ui`, one `TabBar.tsx`): Energy, Controls, a raised centre **Home**, Levels, Settings. It is **flat on purpose**: identical on Android and iOS and matching the dashboard, so on iOS 26 it does not get the floating glass bar. A spike on Android and on iOS 17 and 26 showed it works: a native Stack header per tab, inactive tabs stay mounted (state, scroll and pushed pages survive), `useIsFocused` still drives `Freeze` in `Screen.tsx`, tapping the active tab pops to its first page, deep links and back behave. Because the bar is all JavaScript, its tabs and look can also change over the air (ADR 0003).

## Considered options

- **`NativeTabs` with five equal tabs and a disc image in the middle slot.** Rejected: it can never be raised; Android tints the image into a flat blob (a disc with the van cut out as transparency is the best it does), and on iOS a disc big enough to stand out covers the "Home" label.
- **A glass bar on iOS 26.** Rejected for now: a native dependency and more corner cases for a look that only appears on iOS. Its own ticket if anyone wants it.

## Consequences

- What the system bar gave for free is ours to maintain: `accessibilityRole="tablist"` and tab roles checked with VoiceOver and TalkBack; label wrapping at large text (`numberOfLines={1}` and a font-scale cap, or icons only at the largest sizes); iOS `shadow*` for the raised button (`elevation` is Android-only); about 30 pt of bottom padding in tab content; themed headers and status bar; haptics; the bar must not be pushed above the keyboard.
- `expo-router/ui` is experimental: keep the bar in one component so an SDK upgrade touches one file.
- Not yet checked: iOS 18, VoiceOver and haptics on a real device, the keyboard.
