import { useMemo } from 'react'
import { iconKey, type IconEntity } from '@/lib/entityIcons'
import type { HeaterMode, TemperatureUnit } from '@/types'
import type { AutoSleepTimeoutMinutes } from './reducer'
import { useRenewvanBus } from './RenewvanBusProvider'

// Every command the app sends, as the dashboard sends them (dashboard `src/lib/settings-commands.ts`):
// a JSON value on the entity's `set` topic. Always a TARGET, never a toggle, so a command that is
// delivered twice or late cannot flip a load back (hub ADR 0013, 0021).

type HeaterField =
  | 'set'
  | 'mode/set'
  | 'ventilating/set'
  | 'thermostat/set'
  | 'commands_enabled/set'
  | 'setpoint_c/set'
  | 'power_level/set'

const heaterTopic = (id: string, field: HeaterField) => `renewvan/heater/${id}/${field}`
const relayTopic = (id: string, field: 'set' | 'name/set') => `renewvan/relay/${id}/${field}`
const temperatureTopic = (id: string, field: 'name' | 'unit') =>
  `renewvan/temperature/${id}/${field}/set`
const tiltLevelTopic = (id: string) => `renewvan/tilt/${id}/level_zero/set`
const KIOSK = 'renewvan/kiosk/display'

export interface Commands {
  setRelay: (id: string, on: boolean) => void
  setRelayName: (id: string, name: string) => void
  /** Files a relay under a group, or `null` to take it back to Unassigned (hub ADR 0028). */
  setRelayGroup: (id: string, group: string | null) => void
  /** Replaces the list of groups on offer: their names, in display order. */
  setRelayGroupList: (names: readonly string[]) => void
  /** Replaces the shared order of relays inside a group card: relay ids, first to last. */
  setRelayOrder: (ids: readonly string[]) => void
  /** Starts (`true`) or stops (`false`) the heater. */
  setHeaterRunning: (id: string, run: boolean) => void
  setHeaterMode: (id: string, mode: HeaterMode) => void
  /** Starts fan-only ventilation from off (`true`). Ventilation is not a `mode` value. */
  setHeaterVentilating: (id: string, on: boolean) => void
  setHeaterThermostat: (id: string, on: boolean) => void
  /** The Driver's own command switch: the one heater command it accepts while commands are off. */
  setHeaterCommandsEnabled: (id: string, enabled: boolean) => void
  setHeaterSetpoint: (id: string, celsius: number) => void
  setHeaterPowerLevel: (id: string, level: number) => void
  setTemperatureName: (id: string, name: string) => void
  setTemperatureUnit: (id: string, unit: TemperatureUnit) => void
  /** Picks the icon every client draws an instance with: a name from `lib/entityIcons.ts` (hub ADR 0023). */
  setEntityIcon: (entity: IconEntity, id: string, icon: string) => void
  /** Captures the tilt sensor's current attitude as level (park the van level first). */
  setTiltLevel: (id: string) => void
  /** Clears the captured level, so the angles read raw again. */
  resetTiltLevel: (id: string) => void
  /** `auto` or a battery instance id; the hub persists it. */
  setPrimaryBattery: (value: string) => void
  /** Asks `driver-demo` to switch Demo mode for every client; the view follows the bus, not the tap. */
  setDemoMode: (demo: boolean) => void
  /** The kiosk's screen: 0 to 100. */
  setKioskBrightness: (value: number) => void
  setKioskAutoSleepEnabled: (value: boolean) => void
  setKioskAutoSleepTimeoutMinutes: (value: AutoSleepTimeoutMinutes) => void
  /** Wakes (`true`) or sleeps (`false`) the kiosk's screen. */
  setKioskDisplayPower: (on: boolean) => void
}

export function buildCommands(publish: (topic: string, payload: string) => void): Commands {
  const send = (topic: string, value: unknown) => publish(topic, JSON.stringify(value))
  return {
    setRelay: (id, on) => send(relayTopic(id, 'set'), on),
    setRelayName: (id, name) => send(relayTopic(id, 'name/set'), name),
    setRelayGroup: (id, group) => send('renewvan/hub/relay-groups/set', { id, group }),
    setRelayGroupList: (names) => send('renewvan/hub/relay-group-list/set', names),
    setRelayOrder: (ids) => send('renewvan/hub/relay-order/set', ids),
    setHeaterRunning: (id, run) => send(heaterTopic(id, 'set'), run),
    setHeaterMode: (id, mode) => send(heaterTopic(id, 'mode/set'), mode),
    setHeaterVentilating: (id, on) => send(heaterTopic(id, 'ventilating/set'), on),
    setHeaterThermostat: (id, on) => send(heaterTopic(id, 'thermostat/set'), on),
    setHeaterCommandsEnabled: (id, enabled) =>
      send(heaterTopic(id, 'commands_enabled/set'), enabled),
    setHeaterSetpoint: (id, celsius) => send(heaterTopic(id, 'setpoint_c/set'), celsius),
    setHeaterPowerLevel: (id, level) => send(heaterTopic(id, 'power_level/set'), level),
    setTemperatureName: (id, name) => send(temperatureTopic(id, 'name'), name),
    setTemperatureUnit: (id, unit) => send(temperatureTopic(id, 'unit'), unit),
    setEntityIcon: (entity, id, icon) =>
      send('renewvan/hub/icons/set', { key: iconKey(entity, id), icon }),
    // The driver treats any payload as "capture"; `reset` clears.
    setTiltLevel: (id) => send(tiltLevelTopic(id), 'capture'),
    resetTiltLevel: (id) => send(tiltLevelTopic(id), 'reset'),
    setPrimaryBattery: (value) => send('renewvan/hub/primary-battery/set', value),
    setDemoMode: (demo) => send('renewvan/demo/enabled/set', demo),
    setKioskBrightness: (value) => send(`${KIOSK}/brightness/set`, value),
    setKioskAutoSleepEnabled: (value) => send(`${KIOSK}/auto-sleep-enabled/set`, value),
    setKioskAutoSleepTimeoutMinutes: (value) =>
      send(`${KIOSK}/auto-sleep-timeout-minutes/set`, value),
    // The one bare payload: the kiosk plugin's power topic takes `on` / `off`, not JSON.
    setKioskDisplayPower: (on) => publish(`${KIOSK}/power/set`, on ? 'on' : 'off'),
  }
}

export function useCommands(): Commands {
  const { publish } = useRenewvanBus()
  return useMemo(() => buildCommands(publish), [publish])
}
