import { resolvedRelayGroups, UNASSIGNED_GROUP } from '@/lib/relayGroups'
import { sortByRelayOrder } from '@/lib/relayOrder'

/**
 * App-local presentation config for the Relays tab, keyed by channel id. Which groups exist and
 * which channel is in which are NOT here: they are shared settings on the bus
 * (`renewvan/hub/relay-group-list` and `renewvan/hub/relay-groups`, hub ADR 0028), edited in the
 * dashboard's Settings. It ships EMPTY on purpose, like the dashboard's: which loads are critical
 * is the owner's to say.
 */

/** Loads that ask for confirmation before switching (a pump, a heater, an inverter enable). */
export const criticalRelayIds: string[] = []

export interface RelayPanel {
  title: string
  /** Channel ids to show, in the shared relay order (the rest by id); only ids that are on the bus. */
  ids: string[]
}

/**
 * Places every channel on the bus in a panel. A channel goes in the group the bus holds for it
 * when that group is in `list`; any other channel goes to Unassigned, so a new relay, and one whose
 * group was removed, always appears. Panels run in the order of `list`; a group with no channel is
 * left out.
 */
export function panelsFor(
  ids: readonly string[],
  assignments: Readonly<Record<string, string>>,
  list: readonly string[],
  order: readonly string[] = [],
): RelayPanel[] {
  const groups = resolvedRelayGroups(list)
  const offered = new Set(groups)
  const rest: string[] = []
  const members = new Map<string, string[]>()
  for (const id of ids) {
    const group = Object.hasOwn(assignments, id) ? assignments[id] : undefined
    if (group === undefined || group === UNASSIGNED_GROUP || !offered.has(group)) {
      rest.push(id)
      continue
    }
    members.set(group, [...(members.get(group) ?? []), id])
  }
  return groups.flatMap((title) => {
    const own = title === UNASSIGNED_GROUP ? rest : (members.get(title) ?? [])
    return own.length === 0 ? [] : [{ title, ids: sortByRelayOrder(own, order) }]
  })
}
