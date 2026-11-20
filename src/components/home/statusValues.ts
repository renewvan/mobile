import type { EntityType } from '@/lib/drivers'
import { formatTemperature, OUTDOOR_ID } from '@/lib/temperature'
import { formatDeg, tiltReading } from '@/lib/tilt'
import type { RenewvanBusState } from '@/types'

const first = <T>(record: Record<string, T>): T | undefined => Object.values(record)[0]

/** The one short reading under a status circle; `…` while the type is there but has not reported it. */
export function statusValue(type: EntityType, s: RenewvanBusState): string {
  switch (type) {
    case 'battery': {
      const soc = first(s.batteries)?.soc_pct
      return soc === undefined ? '…' : `${Math.round(soc)}%`
    }
    case 'solar':
      return `${Math.round(Object.values(s.solar).reduce((sum, x) => sum + (x.power_w ?? 0), 0))} W`
    case 'charger':
      return `${Object.keys(s.chargers).length}`
    case 'tank':
      return `${Object.keys(s.tanks).length}`
    case 'relay': {
      const relays = Object.values(s.relays)
      return `${relays.filter((r) => r.state).length}/${relays.length}`
    }
    case 'heater':
      return first(s.heaters)?.phase ?? '…'
    case 'temperature':
      return formatTemperature(s.temperatures[OUTDOOR_ID] ?? first(s.temperatures))
    case 'tilt': {
      const { pitch } = tiltReading(first(s.tilt))
      return pitch === null ? '…' : formatDeg(pitch)
    }
    case 'router': {
      const dbm = first(s.routers)?.signal_rsrp_dbm
      return dbm === undefined ? '…' : `${dbm} dBm`
    }
    case 'gps':
      return '…'
  }
}
