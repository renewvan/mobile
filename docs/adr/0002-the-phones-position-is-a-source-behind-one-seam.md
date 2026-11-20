# The phone's position is a source behind one seam, not a map feature

When the van has no usable GPS, the app can stand in the phone's own position. It is read through one seam, `usePosition()` in `src/location/`, which returns the position, its source (`van`, `phone` or `none`) and the permission status; the permission flow lives there too. The map, the Home map widget and any future CarPlay or Android Auto screen read the same seam, and the code under it knows nothing about MapLibre or any screen. Foreground-only for now; background location, if a car screen needs it, changes that module and the config plugin, not its callers.

## Considered options

- **Read `expo-location` inside the map component.** The obvious route, and rejected: a car screen is built from native templates, not React views, so it could not reuse it, and the permission flow would be tied to a screen.
- **Ask for location at launch.** Rejected: it is asked on a tap, at the point of need, and only when the van has no usable GPS.
- **Publish the phone's position to the bus.** Rejected: the van's GPS is the van's; a phone is not the van, and sending it off-device changes the store's data declaration.

## Consequences

- The van's GPS wins whenever it has a fix; the phone's marker is always labelled "Your phone" and is never merged with the van's.
- The phone's position never leaves the phone.
- Whatever the car shows must be plain data (a widget's value and state), not only a drawn component; the widget catalogue already keeps `needs` and values apart from rendering.
