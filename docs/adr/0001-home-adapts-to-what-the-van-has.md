# Home adapts to what the van has: no onboarding, no starter device

The app is useful to a van with one device and to one with thirty, and nobody is asked what they own: the hub already says so. The default Home is built from the van's **Capabilities** (every default widget is filtered by what is present), its group cards are ordered by use (Energy, Controls, Water, Climate, Van, matching the bar's order), a relay is a **switch on Home** (the Controls card shows relays as tap-to-switch tiles, not a count, and still obeys `controllable`), and a device alone in its group gets a **full-width tile** with more detail (a lone battery shows state of charge, a level bar and time left). The tile goes back to two columns as the group grows: one layout rule, not a second default.

## Considered options

- **A setup wizard ("what do you have?").** Rejected: the bus already knows, and a wizard goes stale the day a driver is added, which is the case this whole effort exists for.
- **A fixed starting device (the battery monitor).** Rejected: enthusiasts start with a shunt, a relay board, a tank sensor or a heater in no fixed order; Home would be wrong for some of them. Energy leads only because it comes first in the order of use, and it appears only if present.
- **A different default layout per van size.** Rejected: it would need its own migration when the van grows; the adaptive tile does the same job with one rule.

## Consequences

- A switch on Home is a command: it follows "never assume it worked" (pending until the retained state changes) and is disabled in Demo mode and while the driver is not `online`.
- A group's card has two looks (tiles, or one wide tile), so tile content must work at both widths.
