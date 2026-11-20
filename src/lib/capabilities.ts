import type { RenewvanBusState } from '@/types'
import {
  ENTITY_TYPES,
  heaterDriversOnline,
  relayDriversOnline,
  type EntityType,
} from '@/lib/drivers'

/**
 * What the van has of one entity type, derived from the bus. Pure and UI-free: the dashboard and
 * the mobile app both draw their widgets from it (mobile copies `src/lib`).
 *
 * - `present`: a Driver's info `publishes` the type OR any entity record of it is on the bus. A
 *   partial record counts, so nothing flickers while the retained burst arrives.
 * - `loading`: nothing yet, and the bus has not settled; `absent`: nothing, and it has.
 * - `offline`: a Driver that publishes the type, or that an entity record of it names, reports `offline` (positive evidence only). The
 *   widget stays, dimmed. A removed Driver reads offline for ever (hub gap, no app-side workaround).
 * - `controllable`: relay and heater only: every Driver publishing it is `online` (the strict rule).
 */
export interface Capability {
  state: 'loading' | 'absent' | 'present'
  count: number
  offline: boolean
  controllable: boolean
}

const CONTROLLABLE: Partial<
  Record<EntityType, (state: Pick<RenewvanBusState, 'drivers'>) => boolean>
> = {
  relay: relayDriversOnline,
  heater: heaterDriversOnline,
}

/**
 * The Capability of each of the ten entity types. The bus has no snapshot-complete signal, so the
 * caller says whether it has `settled`: until then a type with no evidence reads `loading`, not
 * `absent`. Defaults to settled, which is what a pure fixture wants.
 */
export function capabilitiesOf(
  state: RenewvanBusState,
  settled = true,
): Record<EntityType, Capability> {
  const drivers = Object.values(state.drivers)
  return Object.fromEntries(
    ENTITY_TYPES.map(({ type, field }) => {
      const count = Object.keys(state[field]).length
      const publishers = drivers.filter((d) => d.info?.publishes?.includes(type))
      const owners = Object.values(state[field]).flatMap((r: { driver?: string }) =>
        r.driver === undefined ? [] : [state.drivers[r.driver]],
      )
      const present = count > 0 || publishers.length > 0
      const offline = [...publishers, ...owners].some((d) => d?.health === 'offline')
      const capability: Capability = {
        state: present ? 'present' : settled ? 'absent' : 'loading',
        count,
        offline,
        // A dimmed widget must not take taps, even when another Driver of the type is online.
        controllable: !offline && (CONTROLLABLE[type]?.(state) ?? false),
      }
      return [type, capability]
    }),
  ) as Record<EntityType, Capability>
}
