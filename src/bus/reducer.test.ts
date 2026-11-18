import {
  commandAllowed,
  emptyBusData,
  reduceBusMessage,
  visibleState,
  type BusData,
} from './reducer'

function feed(
  messages: [topic: string, payload: string][],
  start: BusData = emptyBusData,
): BusData {
  return messages.reduce(
    (data, [topic, payload]) => reduceBusMessage(data, topic, payload, 1000),
    start,
  )
}

describe('reduceBusMessage', () => {
  it('keeps the same state when a topic repeats the value it already had', () => {
    const data = feed([
      ['renewvan/tank/fresh/level_pct', '62'],
      ['renewvan/gps/main/position', '{"lat":47.98,"lon":7.83}'],
    ])
    expect(reduceBusMessage(data, 'renewvan/tank/fresh/level_pct', '62', 1000)).toBe(data)
    expect(
      reduceBusMessage(data, 'renewvan/gps/main/position', '{"lat":47.98,"lon":7.83}', 1000),
    ).toBe(data)
    const changed = reduceBusMessage(data, 'renewvan/tank/fresh/level_pct', '61', 1000)
    expect(changed).not.toBe(data)
    expect(changed.real.tanks.fresh.level_pct).toBe(61)
    // The untouched slices stay the same objects, so their widgets can skip re-rendering.
    expect(changed.real.gps).toBe(data.real.gps)
  })

  it('accumulates an entity one retained property at a time', () => {
    const data = feed([
      ['renewvan/tank/fresh/level_pct', '62'],
      ['renewvan/tank/fresh/status', '"ok"'],
      ['renewvan/tank/fresh/fluid_type', '"fresh_water"'],
    ])
    expect(data.real.tanks.fresh).toEqual({
      level_pct: 62,
      status: 'ok',
      fluid_type: 'fresh_water',
    })
  })

  it('parses string properties as JSON, so status is ok and not "ok" with quotes', () => {
    const data = feed([['renewvan/battery/house/charge_state', '"bulk"']])
    expect(data.real.batteries.house.charge_state).toBe('bulk')
  })

  it('keeps real and simulated entities apart', () => {
    const data = feed([
      ['renewvan/battery/house/soc_pct', '40'],
      ['renewvan/demo/battery/house/soc_pct', '95.5'],
    ])
    expect(data.real.batteries.house.soc_pct).toBe(40)
    expect(data.demo.batteries.house.soc_pct).toBe(95.5)
  })

  it('shows the simulated van only while demo mode is on', () => {
    const data = feed([
      ['renewvan/battery/house/soc_pct', '40'],
      ['renewvan/demo/battery/house/soc_pct', '95.5'],
    ])
    expect(visibleState(data).batteries.house.soc_pct).toBe(40)
    const on = feed([['renewvan/demo/enabled', 'true']], data)
    expect(visibleState(on).batteries.house.soc_pct).toBe(95.5)
  })

  it('ignores a demo flag that is not a JSON boolean', () => {
    const on = feed([['renewvan/demo/enabled', 'true']])
    expect(feed([['renewvan/demo/enabled', 'yes']], on).demoMode).toBe(true)
  })

  it('never lets the echo of a relay command land as state', () => {
    const data = feed([
      ['renewvan/relay/relay_01/state', 'false'],
      ['renewvan/relay/relay_01/set', 'true'],
    ])
    expect(data.real.relays.relay_01).toEqual({ state: false })
  })

  it('only takes a JSON boolean as a relay state', () => {
    const data = feed([
      ['renewvan/relay/relay_01/state', 'true'],
      ['renewvan/relay/relay_01/state', '"off"'],
    ])
    expect(data.real.relays.relay_01.state).toBe(true)
  })

  it('removes a relay whose state is cleared, and only the label when its name is', () => {
    const start = feed([
      ['renewvan/relay/relay_01/state', 'true'],
      ['renewvan/relay/relay_01/name', '"Pump"'],
    ])
    expect(feed([['renewvan/relay/relay_01/name', '']], start).real.relays.relay_01).toEqual({
      state: true,
    })
    expect(feed([['renewvan/relay/relay_01/state', '']], start).real.relays).toEqual({})
  })

  it('drops heater command echoes but keeps published heater fields', () => {
    const data = feed([
      ['renewvan/heater/cabin/phase', '"off"'],
      ['renewvan/heater/cabin/set', 'true'],
    ])
    expect(data.real.heaters.cabin).toEqual({ phase: 'off' })
  })

  it('records driver info and health, and forgets a driver once both are cleared', () => {
    const info = JSON.stringify({
      driver: 'esp32',
      product: 'Relay board',
      source: 'ESP32',
      version: 'v1',
      publishes: ['relay'],
    })
    const data = feed([
      ['renewvan/esp32/info', info],
      ['renewvan/esp32/health', 'online'],
    ])
    expect(data.real.drivers.esp32.health).toBe('online')
    expect(data.real.drivers.esp32.info?.publishes).toEqual(['relay'])
    const cleared = feed(
      [
        ['renewvan/esp32/info', ''],
        ['renewvan/esp32/health', ''],
      ],
      data,
    )
    expect(cleared.real.drivers).toEqual({})
  })

  it('does not read the simulated van’s own health as a real driver', () => {
    const data = feed([['renewvan/demo/health', 'online']])
    expect(data.real.drivers).toEqual({})
  })

  it('reads the shared relay settings', () => {
    const data = feed([
      ['renewvan/hub/relay-groups', '{"relay_01":"Lights","relay_02":""}'],
      ['renewvan/hub/relay-group-list', '["Lights","Water","Lights"]'],
      ['renewvan/hub/relay-order', '["relay_02","relay_01"]'],
      ['renewvan/hub/primary-battery', '"wattcycle"'],
    ])
    expect(data.relayGroups).toEqual({ relay_01: 'Lights' })
    expect(data.relayGroupList).toEqual(['Lights', 'Water'])
    expect(data.relayOrder).toEqual(['relay_02', 'relay_01'])
    expect(data.primaryBattery).toBe('wattcycle')
  })

  it('reads the kiosk display, and ignores values outside what the plugin publishes', () => {
    const data = feed([
      ['renewvan/kiosk/display/power', 'on'],
      ['renewvan/kiosk/display/brightness', '42'],
      ['renewvan/kiosk/display/auto-sleep-enabled', 'true'],
      ['renewvan/kiosk/display/auto-sleep-timeout-minutes', '15'],
      ['renewvan/kiosk/display/brightness', '250'],
      ['renewvan/kiosk/display/auto-sleep-timeout-minutes', '7'],
      ['renewvan/kiosk/display/power', 'dim'],
    ])
    expect(data.kiosk).toEqual({
      power: 'on',
      brightness: 42,
      autoSleepEnabled: true,
      autoSleepTimeoutMinutes: 15,
    })
  })

  it('reads the Tailscale status and drops a malformed one', () => {
    const status = { enabled: true, connected: true, ip: '100.64.0.2', hostname: 'van', peers: 3 }
    const data = feed([['renewvan/tailscale/status', JSON.stringify(status)]])
    expect(data.tailscale).toEqual(status)
    expect(feed([['renewvan/tailscale/status', '{"enabled":true}']], data).tailscale).toBeNull()
  })

  it('reads the shared entity icons', () => {
    const data = feed([['renewvan/hub/icons', '{"relay/relay_01":"Lightbulb","tank/fresh":3}']])
    expect(data.entityIcons).toEqual({ 'relay/relay_01': 'Lightbulb' })
  })

  it('returns the same object for a topic it does not know', () => {
    expect(reduceBusMessage(emptyBusData, 'renewvan/unknown/thing', 'on')).toBe(emptyBusData)
  })
})

describe('commandAllowed', () => {
  it('sends everything outside demo mode', () => {
    expect(commandAllowed(false, 'renewvan/relay/relay_01/set')).toBe(true)
  })

  it('holds back entity commands in demo mode', () => {
    expect(commandAllowed(true, 'renewvan/relay/relay_01/set')).toBe(false)
    expect(commandAllowed(true, 'renewvan/heater/cabin/set')).toBe(false)
    expect(commandAllowed(true, 'renewvan/hub/primary-battery/set')).toBe(true)
    expect(commandAllowed(true, 'renewvan/kiosk/display/brightness/set')).toBe(true)
    expect(commandAllowed(true, 'renewvan/demo/enabled/set')).toBe(true)
  })
})
