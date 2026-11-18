import { useMemo } from 'react'
import { useCommands } from '@/bus/commands'
import { useRenewvanBus } from '@/bus/RenewvanBusProvider'
import { driverRows } from '@/lib/drivers'
import { AUTO_PRIMARY_BATTERY } from '@/lib/primaryBattery'
import { DEFAULT_RELAY_GROUP_LIST, resolvedRelayGroups } from '@/lib/relayGroups'

/**
 * What every Settings view reads: the van on the bus, the Driver rows derived from it, the shared
 * hub settings in the shape the dashboard's Settings uses, and the commands that change them.
 */
export function useSettingsData() {
  const bus = useRenewvanBus()
  const commands = useCommands()
  const { state } = bus
  // One row per Driver, then one fallback row per entity type no Driver claims.
  const drivers = useMemo(() => driverRows(state), [state])
  const routerId = Object.keys(state.routers)[0]
  return {
    ...bus,
    commands,
    drivers,
    /** The list of relay groups on offer, in display order, with Unassigned in it. */
    groupList: useMemo(
      () => resolvedRelayGroups(bus.relayGroupList ?? DEFAULT_RELAY_GROUP_LIST),
      [bus.relayGroupList],
    ),
    /** `auto` or a battery instance id. */
    primaryBatterySelection: bus.primaryBattery ?? AUTO_PRIMARY_BATTERY,
    router: routerId === undefined ? undefined : state.routers[routerId],
    routerUpdatedAt: routerId === undefined ? undefined : state.routerUpdatedAt[routerId],
    routerHealth: state.drivers.router?.health ?? null,
  }
}

export type SettingsData = ReturnType<typeof useSettingsData>
