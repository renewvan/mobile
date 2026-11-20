# Hub contract audit: what the bus says about installed drivers

Wayfinder ticket: "Hub contract audit: what the bus says about installed drivers" (map: "Mobile: widgets follow the installed drivers").
Sources: `../hub` (`CONTEXT.md`, `docs/authoring-a-driver.md`, `docs/adr/0008,0011,0013,0019`, `schema/driver-info.schema.json`), every `../driver-*/manifest.json` and `publisher.py`, `driver-demo`, and this repo's `src/bus/reducer.ts`, `src/lib/drivers.ts`.

## Findings

1. **Every real driver publishes retained `info` (with `publishes`) then retained `online`, with a retained `offline` last will.** Verified in `publisher.py` of autoterm, gps, router, tank, temperature, tilt, vedirect, venus, wattcycle; esp32 does it in `packages/base.yaml`. The rule is authored in `hub/docs/authoring-a-driver.md` ("On every connect, publish info first, then online").
2. **`driver-demo` replays the hub-owned fleet file** `schema/demo/fleet.demo-fleet.json` (`publishes` per simulated driver) as retained info and health under `renewvan/demo/`. Demo therefore follows `publishes` with no special case; switching Demo off clears the simulated topics (`docs/demo-mode.md`).
3. **`publishes` is a static enum of exactly the ten entity types** (battery, charger, gps, heater, relay, router, solar, tank, temperature, tilt), the same set as the app's `ENTITY_TYPES`. `validate-examples.sh` forces the enum and the entity schemas to stay in sync. A new entity type therefore needs a hub schema PR first (and a demo scenario), and the app cannot know it in advance.
4. **Info stays retained when a driver goes offline, by design (ADR 0011), and cleaning up a driver removed for good is explicitly "out of scope".** A removed driver is indistinguishable from an offline one: info retained, health `offline`. ADR 0012 shows the same hazard from the other side (a reused key inherits stale retained topics). `driver-esp32/scripts/clear_board.py` is the only removal tool, and only for ESP32 boards.
5. **Entity topics are retained too**, so a removed driver's last values also linger (only drivers like vedirect clear live values on silence, and identity stays). "Entity present on the bus" is not proof of "installed" either.
6. **`driver` on an entity instance is optional** except on `relay` (required, no fallback, ADR 0013/0027). Without it a consumer attributes the instance to every driver whose info publishes the type (ADR 0019).
7. **No forward-compat field.** `driver-info` has `version` (the driver's release), not a contract/schema version.
8. **No "snapshot complete" marker.** Retained messages arrive in broker order with no end signal, and `RenewvanBusProvider` has no ready state for drivers today. The app must infer settlement.
9. **Publish order helps:** info is retained before `online` on every connect, so a driver that is `online` always has info.

## Gaps for the hub / drivers

- **G1 (contradicts "an offline driver keeps its widget").** There is no way to tell "uninstalled" from "offline". Options: a hub-side removal that clears the driver's retained info, health and entity topics; a last-seen timestamp in health; or an app-side rule (offline longer than N days hides it).
- **G2.** Entity instances of a removed driver linger as retained state (finding 5), so the "entity present" half of the union rule has the same problem.
- **G3 (optional).** A contract version in info, and a retained "drivers complete" marker or count, would make unknown-type handling and the loading state cleaner.
