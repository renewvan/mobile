import { emptyRenewvanBusState, type DriverInfo, type RenewvanBusState } from '@/types'
import { capabilitiesOf } from './capabilities'

function stateWith(partial: Partial<RenewvanBusState>): RenewvanBusState {
  return { ...emptyRenewvanBusState, ...partial }
}

function info(driver: string, publishes?: string[]): DriverInfo {
  return { driver, product: driver, source: 'test', version: 'v1.0.0', publishes }
}

const ABSENT = { state: 'absent', count: 0, offline: false, controllable: false }

describe('capabilitiesOf', () => {
  it('reads an empty van as absent for all ten types', () => {
    const caps = capabilitiesOf(emptyRenewvanBusState)
    expect(Object.keys(caps).sort()).toEqual([
      'battery',
      'charger',
      'gps',
      'heater',
      'relay',
      'router',
      'solar',
      'tank',
      'temperature',
      'tilt',
    ])
    for (const cap of Object.values(caps)) expect(cap).toEqual(ABSENT)
  })

  it('reads everything as loading until settled, but never hides what has arrived', () => {
    const caps = capabilitiesOf(stateWith({ batteries: { '1': {} as never } }), false)
    expect(caps.battery.state).toBe('present')
    expect(caps.tank).toEqual({ ...ABSENT, state: 'loading' })
  })

  it('a shunt only: battery present with its count, the rest absent', () => {
    const caps = capabilitiesOf(
      stateWith({
        drivers: { venus: { health: 'online', info: info('venus', ['battery']) } },
        batteries: { '288': { driver: 'venus' } as never },
      }),
    )
    expect(caps.battery).toEqual({
      state: 'present',
      count: 1,
      offline: false,
      controllable: false,
    })
    expect(caps.solar.state).toBe('absent')
    expect(caps.relay.state).toBe('absent')
  })

  it('a full van: every type present, relay and heater controllable', () => {
    const all = [
      'tank',
      'battery',
      'solar',
      'charger',
      'relay',
      'router',
      'gps',
      'temperature',
      'tilt',
      'heater',
    ]
    const caps = capabilitiesOf(
      stateWith({
        drivers: { all: { health: 'online', info: info('all', all) } },
        tanks: { a: {} as never, b: {} as never },
        batteries: { a: {} as never },
        solar: { a: {} as never },
        chargers: { a: {} as never },
        relays: { a: {} as never },
        routers: { a: {} as never },
        gps: { a: {} as never },
        temperatures: { a: {} as never },
        tilt: { a: {} as never },
        heaters: { a: {} as never },
      }),
    )
    for (const cap of Object.values(caps)) {
      expect(cap.state).toBe('present')
      expect(cap.offline).toBe(false)
    }
    expect(caps.tank.count).toBe(2)
    expect(caps.relay.controllable).toBe(true)
    expect(caps.heater.controllable).toBe(true)
    expect(caps.battery.controllable).toBe(false)
  })

  it('a relay driver offline: relay stays present, offline, not controllable', () => {
    const caps = capabilitiesOf(
      stateWith({
        drivers: { relay: { health: 'offline', info: info('relay', ['relay']) } },
        relays: { '1': {} as never },
      }),
    )
    expect(caps.relay).toEqual({ state: 'present', count: 1, offline: true, controllable: false })
  })

  it('controllable needs every publishing driver online', () => {
    const caps = capabilitiesOf(
      stateWith({
        drivers: {
          a: { health: 'online', info: info('a', ['relay']) },
          b: { health: 'offline', info: info('b', ['relay']) },
        },
        relays: { '1': {} as never },
      }),
    )
    expect(caps.relay.controllable).toBe(false)
    expect(caps.relay.offline).toBe(true)
  })

  it('a legacy entity without `driver` and no drivers is present, not offline', () => {
    const caps = capabilitiesOf(stateWith({ tanks: { fresh: {} as never } }))
    expect(caps.tank).toEqual({ state: 'present', count: 1, offline: false, controllable: false })
  })

  it('a driver with info but no `publishes` makes nothing present', () => {
    const caps = capabilitiesOf(
      stateWith({ drivers: { x: { health: 'online', info: info('x') } } }),
    )
    for (const cap of Object.values(caps)) expect(cap.state).toBe('absent')
  })

  it('a removed driver (retained info, offline) stays present and offline for ever', () => {
    const caps = capabilitiesOf(
      stateWith({ drivers: { tilt: { health: 'offline', info: info('tilt', ['tilt']) } } }),
    )
    expect(caps.tilt).toEqual({ state: 'present', count: 0, offline: true, controllable: false })
  })

  it('offline is positive evidence only: unknown health is not offline', () => {
    const caps = capabilitiesOf(stateWith({ drivers: { tilt: { info: info('tilt', ['tilt']) } } }))
    expect(caps.tilt.state).toBe('present')
    expect(caps.tilt.offline).toBe(false)
  })

  it('a partial record mid-burst counts as present', () => {
    const caps = capabilitiesOf(stateWith({ heaters: { h: { driver: 'autoterm' } as never } }))
    expect(caps.heater.state).toBe('present')
    expect(caps.heater.count).toBe(1)
    // no driver info yet, so the strict rule has nothing to trust
    expect(caps.heater.controllable).toBe(false)
  })

  it('an entity naming an offline driver reads offline even when the info lacks `publishes`', () => {
    const caps = capabilitiesOf(
      stateWith({
        drivers: { autoterm: { health: 'offline', info: info('autoterm') } },
        heaters: { h: { driver: 'autoterm' } as never },
      }),
    )
    expect(caps.heater).toMatchObject({ state: 'present', offline: true, controllable: false })
  })

  it('a type that reads offline is never controllable, even with another relay Driver online', () => {
    const caps = capabilitiesOf(
      stateWith({
        drivers: {
          a: { health: 'online', info: info('a', ['relay']) },
          b: { health: 'offline', info: info('b') },
        },
        relays: { '1': { driver: 'b' } as never },
      }),
    )
    expect(caps.relay).toMatchObject({ offline: true, controllable: false })
  })
})
