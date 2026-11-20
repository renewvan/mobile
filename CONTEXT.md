# renewvan mobile

The phone app for a van running the renewvan hub. It shows what the hub's drivers publish and sends commands back. Entities, drivers and the bus are defined in `../hub/CONTEXT.md`; this file only adds what is specific to the app.

## Language

**Capability**:
One of the ten entity types the van currently has: derived from the bus, per entity type, as `loading`, `absent` or `present` (with an instance count and an `offline` flag). A type is present when a Driver's info `publishes` it or an entity of that type is on the bus.
_Avoid_: feature, module, "installed" as a noun (it is the rule, not the thing)

**Home**:
The app's first screen: the Start tab, a set of **Widgets** the phone's owner chooses, orders and hides.
_Avoid_: Start (the old name), Dashboard (the kiosk app)

**Widget**:
One block on Home (status circles, map, Scenes, a group card, a full card). It may need a **Capability**; it hides when that is absent.
_Avoid_: tile, card (those are looks, not the thing)
