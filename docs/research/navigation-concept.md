# Navigation concept: do the five bottom tabs still make sense?

Wayfinder map: "Mobile: widgets follow the installed drivers". Asked after the release-free decision ("Which driver changes must never need an app release?"). Constraint: native bottom bar, at most five tabs on Android.

## 1. What the platform guidelines say

- **Apple HIG, Tab bars** (<https://developer.apple.com/design/human-interface-guidelines/tab-bars>, fetched as the JSON behind the page):
  - "Use a tab bar to support navigation, not to provide actions"; tabs are "different types of information or functionality" and each keeps its own navigation state.
  - "Use the appropriate number of tabs"; "it's generally easier to navigate among fewer tabs"; "Avoid overflow tabs" (the trailing tab becomes More).
  - **"Don't disable or hide tab bar buttons, even when their content is unavailable. Having tab bar buttons available in some cases but not others makes your app's interface appear unstable and unpredictable. If a section is empty, explain why its content is unavailable."**
  - "Make sure the tab bar is visible when people navigate to different sections" (hiding it makes people forget where they are, except under a modal).
  - Badges only for critical information.
- **Material 3 navigation bar** (<https://github.com/material-components/material-components-android/blob/master/docs/components/BottomNavigation.md>; the m3.material.io guidelines page is script-rendered and could not be fetched as text): "Navigation bars can have three to five destinations", each an icon plus label, for switching between top-level views.
- **expo-router / NativeTabs** (see the research branch `research/native-tabs-dynamic`): hiding or showing a trigger remounts the tab bar and resets tab state; a hidden tab cannot be navigated to; Android throws on a sixth visible tab.

**Consequence.** Hiding tabs per installed driver is against Apple's guidance, and the documented NativeTabs behaviour makes it the roughest possible way to do it. A tab bar that changes shape when a driver changes is the "unstable and unpredictable" case. Tabs should be a stable set of *sections*, not one per device.

## 2. The closest comparable: Victron Venus OS GUI v2 (the hub's device model already follows Venus)

Source: `victronenergy/gui-v2` (`pages/MainView.qml`, `PageManager.qml`, `LevelsPage.qml`, `components/NavBar.qml`, list of `pages/`), read from the main branch.

- Fixed top-level pages: **Brief, Overview, Levels, Notifications, Settings** (MainView.qml comment: "main application pages (Brief, Overview, Levels, Notifications, and Settings)"). A `NavBar` with a **More** button when they don't all fit.
- **Overview is the dashboard of devices and its widgets drill down**: MainView.qml: "This stack is used to view Overview drilldown pages and Settings sub-pages. When pageManager.pushPage() is called, pages are pushed onto this stack." Device pages (battery, solar, inverter/charger, loads, EV charger...) live under `pages/<type>/` and are reached from the widget, not from a tab.
- **Only one page is availability-driven**: Levels (tanks + environment) is inserted when the data exists. It cost them special code: MainView.qml notes "When the page model changes, the view currentIndex resets to 0 ... if the Boat/Levels availability is not known until after the main UI is loaded; in that case, go to the Start Page to avoid confusion", and restores the user's page otherwise. That is the tab-remount problem again, solved by hand.
- Inside Levels, the two tabs (Tanks / Environment) are **enabled by data** (`enabled: Services.environment.model.count > 0`): dynamic content lives inside a stable page.
- **Control** is its own concept: `ControlCardsPage.qml` (swipe-up control cards), apart from monitoring.
- **VRM portal manual** (<https://www.victronenergy.com/media/pg/VRM_Portal_manual/en/index-en.html>, table of contents): Dashboard (widgets per section), real-time data, **controls in VRM** (inverter/charger, relay, generator, EV charger) each under the device, Alarms and monitoring, Advanced dashboard (custom widgets), Event logs, Fleet dashboard.

Not fetched (no usable first-party text from a plain request): Home Assistant companion app navigation details (the docs only confirm dashboards with Views/Sections and a Sidebar), Apple Home, Google Home, Tesla, Truma, Garmin. They are left out rather than described from memory.

## 2b. Home Assistant (the largest open home-automation app)

Sources: <https://www.home-assistant.io/blog/2024/03/04/dashboard-chapter-1/>, <https://www.home-assistant.io/dashboards/sections/>, and the frontend source `home-assistant/frontend`, `src/panels/lovelace/strategies/home/` (`home-dashboard-strategy.ts` and its view strategies), read from the dev branch.

- The new default **"Home" dashboard is generated from what exists, not authored**: views are `overview`, **one view per Area** (`hass.areas.map(...)`, each a `home-area` strategy), `media-players`, and `other-devices`. A user adds a device or an area and the dashboard changes with no app or frontend release.
- It is organised by **place** (Areas the user defines), with a **catch-all "Other devices"** view for anything that fits no section. That is the same job as this map's decision to list unsupported drivers instead of hiding them.
- Stated design goals (2024.3 "Project Grace" post): a default dashboard that is "more useful, user-friendly, and relevant right out of the box", "predictable and memorable" (the reason the Z-grid auto-layout was chosen), organised in Sections on a grid, and responsive.
- Navigation chrome: the dashboards page documents Views, Sections and a **Sidebar** (not a bottom tab bar); the companion app wraps that web UI. I could not verify the exact mobile navigation of the companion apps from first-party text, so nothing more is claimed.
- Takeaway for this app: the proven way to stay release-free is **structure derived from data** (areas/instances) over a **fixed vocabulary of cards/pages per entity type**, with an explicit fallback bucket. The van has no Areas today; the nearest existing shared grouping is relay groups (a hub setting).

## 2c. What could not be researched

Apple Home, Google Home, SmartThings, Tesla, Truma, Garmin: the first-party support pages are app-gated, script-rendered or blocked to plain requests (403 / 404 / empty), and a search engine was unavailable. They are **not** covered and nothing here is said about them from memory. Screenshots or the specific apps the owner likes would be a better source than guessing.

## 3. What this app does today (internal audit)

From `src/app/(tabs)/*`, `src/components/*`, `src/components/settings/*`:

| Tab | Shows | Same thing as a Start widget? |
| --- | --- | --- |
| Start | 9 widgets: temperature, map, power flow, battery, heater, solar, tilt, fresh water, grey water | the page itself |
| Power | `PowerFlow` + `SolarCard` | yes: identical to the Power flow and Solar widgets (the Start card uses a card variant) |
| Tanks | one `TankCard` per tank | widgets show only the first fresh and first grey tank |
| Climate | `HeaterCard` (full) + `TemperatureCard` per sensor | Start has the heater widget variant and one aggregate temperature card |
| Relays | `RelayPanels`: every relay, grouped | **no widget**: the only control surface with no Start presence |

Other facts:
- Start widgets are **not tappable** except the map (`onExpand` opens Settings › Map). Nothing drills down.
- The map has no tab. It is a Start widget that opens a screen under Settings.
- The router has no widget or tab; it is the header connection state and Settings › Connectivity.
- Per-device detail and configuration lives in **Settings › Devices** (drivers, tanks, temperature, gps, relays, heater, batteries, solar, chargers): a second place to look for a device.
- The header holds the Settings button (with an attention dot for alerts/disconnect), the DEMO chip and the logo. Alerts is a pushed screen, not a tab.
- Cross-entity views are Power flow (battery+solar+chargers) and the relay panels (grouping is shared hub state). Everything else is one entity type per page.

So four of the five tabs are the Start widgets again, at full size, and the one tab with unique content (Relays) is the one with no widget.

## 4. Patterns, against the constraint "no app release when the van's drivers change"

| Pattern | Fit | Notes |
| --- | --- | --- |
| **A. Fixed topical tabs (today)** | partial | Works while every tab always has an empty state; but five slots are spent on read-only duplicates and a new entity type has no slot left. |
| **C. Dynamic tabs per installed capability** | poor | Against HIG; remounts the bar (documented); the Venus team needed explicit index-restore code for just one dynamic page; Android's cap of five means a new type may have nowhere to go. |
| **D. Start only + pushed entity pages** (widget tap opens the device page; e.g. GPS widget opens the map) | good | Matches Venus Overview and VRM Dashboard→device. A page per **entity type** (ten, hard-coded, as already decided) shown for the **instances** present, so adding a driver changes content, not navigation. Needs a way to reach it even when the widget is hidden/unavailable. |
| **B. Stable cross-cutting tabs + drill-down** | good | Tabs are sections of the *app*, not of the *van*: e.g. Start, Controls (everything writable: relays, heater), Map, Alerts, Settings. Venus is this shape (Brief/Overview/Levels/Notifications/Settings). |
| **E. B + D** | best fit | Stable bar, widgets drill down, empty/unsupported states explain themselves (HIG), phone GPS means the Map tab is never empty. |

Points that make E hold together here:
- With the agreed phone-GPS fallback the Map is useful on every van, so it can be a permanent destination instead of a Settings detour.
- "Controls" is a concept that is not tied to a device kind: relays, the heater, and later any writable entity (ADR 0013/0021 writes). A new writable type appears *inside* it with no new tab.
- Alerts already exist as a pushed screen with a header attention dot; a tab badge is HIG's "critical information" use.
- Settings › Devices per-type pages are the natural drill-down targets of the widgets (they are entity detail pages today, only reached the long way round).

## 5. Open questions this surfaces (for the owner, not decided here)

1. Which four or five stable sections? Candidates: Start, Controls, Map, Alerts, Settings; or keep Power/Tanks as "Levels"-style read pages.
2. Do widgets drill down to entity pages, and where do those pages live (reusing Settings › Devices pages, or new detail screens)?
3. Does the heater (monitoring + commands) live under Controls, or keep a page of its own?
4. Is a tab per section with its own empty state acceptable where nothing of that kind is installed (HIG), instead of hiding it?
5. Where does Settings live: tab or header button (today)?
6. Should structure be organised by **device type** (today), by **purpose** (monitor / control / locate / alerts), or by **place** (Home Assistant's Areas; relay groups are the only equivalent today)?
