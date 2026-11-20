import { hasGpsFix, isCompleteGps, type Gps, type RenewvanBusState } from '@/types'

export interface Position {
  latitude: number
  longitude: number
  /** Horizontal accuracy in metres; the van's GPS does not expose it directly. */
  accuracy: number | null
}

export type PhonePosition = Position
export type PositionSource = 'van' | 'phone' | 'none'

export interface PositionPermission {
  status: 'undetermined' | 'denied' | 'granted'
  canAskAgain: boolean
}

/** The van's usable GPS, ignoring a retained fix whose Driver has gone offline. */
export function selectVanGps(state: Pick<RenewvanBusState, 'gps' | 'drivers'>): Gps | undefined {
  return Object.values(state.gps).find((gps) => {
    if (!isCompleteGps(gps) || !hasGpsFix(gps)) return false
    if (gps.driver !== undefined) return state.drivers[gps.driver]?.health !== 'offline'
    // A legacy fix has no owner of its own; an offline Driver that claims GPS makes it stale.
    return !Object.values(state.drivers).some(
      (driver) => driver.info?.publishes?.includes('gps') && driver.health === 'offline',
    )
  })
}

/** Plain data behind usePosition: one source only, with a fixed van always winning. */
export function resolvePosition(
  van: Gps | undefined,
  phone: PhonePosition | null,
): { position: Position | null; source: PositionSource } {
  if (van?.latitude !== undefined && van.longitude !== undefined) {
    return {
      source: 'van',
      position: { latitude: van.latitude, longitude: van.longitude, accuracy: null },
    }
  }
  return phone === null ? { source: 'none', position: null } : { source: 'phone', position: phone }
}

export function locationPermissionLabel(permission: PositionPermission | null): string {
  if (permission === null) return 'Checking…'
  if (permission.status === 'granted') return 'Allowed'
  if (permission.status === 'undetermined') return 'Not requested'
  return permission.canAskAgain ? 'Denied' : 'Off for this app'
}
