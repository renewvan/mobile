import type { Battery, Relay, Tank } from '../types'

export const fixtureTanks: Record<string, Tank> = {
  fresh: { fluid_type: 'fresh_water', capacity_l: 70, level_pct: 64.3, status: 'ok' },
  grey: { fluid_type: 'grey_water', capacity_l: 70, level_pct: 12, status: 'open_circuit' },
}

export const fixtureBatteries: Record<string, Battery> = {
  house: {
    soc_pct: 87.2,
    voltage_v: 13.1,
    current_a: -4.6,
    power_w: -60.3,
    temperature_c: 21.5,
    charge_state: 'absorption',
  },
}

export const fixtureRelays: Record<string, Relay> = {
  lights_ceiling: { state: true },
  water_pump: { state: false },
}
