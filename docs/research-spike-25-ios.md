# Spike #25: iOS run (headless tab bar vs native bar)

Throwaway branch `research/tab-bar-spike`. Never merge. Android results are in the ticket (renewvan/mobile#25); this run covers iOS only.

## Run

1. `bun install` (or `npm install`), then a **development build** for iOS: `npx expo run:ios` (simulator) or `eas build --profile development --platform ios`. Expo Go cannot run this app.
2. `npx expo start --dev-client`. Sign in or use Demo mode. On the **Start** tab two buttons open the spike: **SPIKE #25: D headless tabs** and **SPIKE #25: F native tabs**.
3. Deep links: `xcrun simctl openurl booted renewvan://spike-tabs/home` and `renewvan://spike-native/home`.

Test on **iOS 26 (glass)** and, if you can, **iOS 18**; light and dark; with Settings > Accessibility > Display & Text Size > Larger Text on, at the largest size.

## What to check

**D: `src/app/spike-tabs/_layout.tsx` (custom bar, raised centre Home button)**
- Raised button: does it sit right next to iOS 26's glass? Clipped by the home indicator or the safe area? Does the 5px ring match the background in light and dark?
- Bottom inset: bar clears the home indicator, content is not hidden behind the bar.
- Swipe-back gesture on a pushed detail page (edge swipe) and the native header (large or small, blur).
- Tapping the active tab pops to its first page; state, scroll and the pushed page survive a tab switch (mount time in the card does not change).
- Large text: do labels wrap mid-word (they do on Android)?
- Haptics on tap, VoiceOver reads "Home, tab, selected".

**F: `src/app/spike-native/_layout.tsx` (NativeTabs, a disc image in the centre slot)**
- `src` with `renderingMode: 'original'`: does the disc keep its own colours (it does not on Android, which tints it)? Note the current `assets/spike/van-disc.png` is a white disc with the van cut out, made for Android's tint; to test original colours, swap in a coloured disc with a white van.
- Taller icon: does a bigger image stretch the bar or get clipped in its slot (try a 40 pt and a 56 pt image)?
- How the selected state looks against the glass indicator.

## Report back

For each of D and F on iOS: a screenshot (light and dark), and a yes/no with one line on every check above. Then comment on #25 with: go or no-go for D on iOS, and anything the build ticket must handle.
